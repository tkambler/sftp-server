'use strict';

const debug = require('debug')('sftp:stream-manager');
const SFTPStream  = require('ssh2-streams').SFTPStream;
const sftpStreamExtensions = require('./sftp-stream-extensions');
const sftpEvents = require('./sftp-events');
const _ = require('lodash');
const ssh2 = require('ssh2');
const STATUS_CODE = ssh2.SFTP_STATUS_CODE;
const path = require('path');
const moment = require('moment');
const fs = require('./fs');
const DirAdapter = require('./adapters/dir');
const FileReader = require('./adapters/file-reader');
const FileWriter = require('./adapters/file-writer');

class StreamManager {

    constructor(clientManager, client, stream) {

        debug('Initializing StreamManager');

        this.clientManager = clientManager;
        this.server = clientManager.server;
        this.client = client;
        this.stream = stream;
        Object.defineProperties(this.stream, sftpStreamExtensions);
        sftpEvents.forEach((event) => {
            const fn = `on${event}`;
            this.stream.on(event, (...args) => {
                const [reqID] = args;
                if (_.isFunction(this[fn])) {
                    return this[fn].apply(this, args);
                } else {
                    debug(`Unsupported stream event: ${event}`);
                    return this.stream.status(reqID, STATUS_CODE.FAILURE);
                }
            });
        });

    }

    get handlers() {
        return this._handlers ? this._handlers : this._handlers = {};
    }

    set handlers(val) {
        return this._handlers = val;
    }

    get stream() {
        return this._stream;
    }

    set stream(val) {
        return this._stream = val;
    }

    get realPath() {
        return this._realPath ? this._realPath : this._realPath = '.';
    }

    set realPath(val) {
        return this._realPath = val;
    }

    canRead(file) {
        return true;
    }

    canWrite(file) {
        return true;
    }

    /**
     * Given a filepath provided by the client, return the corresponding absolute path to a file on the
     * server (beneath the requesting user's directory).
     */
    getLocalPath(reqPath) {
        return path.join(this.server.dataDirectory, this.client.username, reqPath);
    }

    setAdapter(id, handler) {
        if (_.isUndefined(id)) {
            throw new Error(`id is undefined`);
        }
        if (handler) {
            this.handlers[id] = handler;
        } else if (this.handlers[id]) {
            delete this.handlers[id];
        }
    }

    getAdapter(id) {
        return this.handlers[id];
    }

    generateHandlerID() {
        return _.keys(this.handlers).length + 1;
    }

    getHandleAdapter(handle) {
        let adapter;
        if (handle.length !== 4 || !(adapter = this.getAdapter(handle.readUInt32BE(0)))) {
            return undefined;
        }
        return adapter;
    }

    onREALPATH(reqID, reqPath) {

        const localPath = this.getLocalPath(reqPath);

        debug('onREALPATH', {
            'reqID': reqID,
            'reqPath': reqPath,
            'localPath': localPath
        });

        return fs.ensureDirAsync(localPath)
            .then(() => {
                return fs.statAsync(localPath);
            })
            .then((stats) => {
                return [
                    {
                        'filename': '/',
                        'longname': `drw------- ${stats.nlink} ${this.client.username} ${this.client.username} ${stats.size} ${moment().format('MMM D H:mm')} /`,
                        'attrs': {}
                    }
                ];
            })
            .then((records) => {
                debug('Records', records);
                return this.stream.name(reqID, records);
            });

    }

    onOPENDIR(reqID, reqPath) {

        debug('onOPENDIR', {
            'reqID': reqID,
            'reqPath': reqPath
        });

        const handle = new Buffer(4);
        const handlerID = this.generateHandlerID();
        handle.writeUInt32BE(handlerID, 0);
        const adapter = new DirAdapter(this, reqPath);
        this.setAdapter(handlerID, adapter);
        this.stream.handle(reqID, handle);

    }

    onREADDIR(reqID, handle) {

        debug('onREADDIR', {
            'reqID': reqID
        });

        const adapter = this.getHandleAdapter(handle);
        if (!adapter) {
            return sftpStream.status(reqID, STATUS_CODE.FAILURE);
        }

        return adapter.readdir()
            .then((names) => {
                debug('READDIR success');
                return this.stream.name(reqID, names);
            })
            .catch({
                'code': 'EOF'
            }, () => {
                debug('READDIR EOF');
                return this.stream.status(reqID, STATUS_CODE.EOF);
            })
            .catch((err) => {
                debug('READDIR error', err);
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onCLOSE(reqID, handle) {

        debug('onCLOSE', {
            'reqID': reqID
        });

        const adapter = this.getHandleAdapter(handle);
        if (!adapter) {
            return sftpStream.status(reqID, STATUS_CODE.FAILURE);
        }

        return adapter.close()
            .then(() => {
                return this.stream.status(reqID, STATUS_CODE.OK);
            })
            .catch(() => {
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onOPEN(reqID, filename, flags, attrs) {

        const localPath = this.getLocalPath(filename);

        debug('onOPEN', {
            'reqID': reqID,
            'filename': filename,
            'localPath': localPath,
            'flags': flags
        });

        let adapter;
        flags = SFTPStream.flagsToString(flags);

        debug('flags', flags);

        switch (flags) {
            case 'r':
                if (!this.canRead(localPath)) {
                    return this.stream.status(reqID, STATUS_CODE.FAILURE);
                }
                adapter = new FileReader(this, localPath, flags, attrs);
            break;
            case 'w':
                if (!this.canWrite(localPath)) {
                    return this.stream.status(reqID, STATUS_CODE.FAILURE);
                }
                adapter = new FileWriter(this, localPath, flags, attrs);
            break;
            default:
                debug('Unknown flags', flags);
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
        }

        const handle = new Buffer(4);
        const handlerID = this.generateHandlerID();
        handle.writeUInt32BE(handlerID, 0);
        this.setAdapter(handlerID, adapter);

        return adapter.open()
            .then(() => {
                debug('sending handle');
                return this.stream.handle(reqID, handle);
            })
            .catch(() => {
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onSTAT(reqID, path) {

        const localPath = this.getLocalPath(path);

        debug('onSTAT', {
            'reqID': reqID,
            'path': path,
            'localPath': localPath
        });

        return Promise.resolve()
            .then(() => {
                return fs.statAsync(localPath);
            })
            .then((stats) => {
                this.stream.attrs(reqID, stats);
            })
            .catch((err) =>{
                this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onWRITE(reqID, handle, offset, data) {

        debug('onWRITE', {
            'reqID': reqID,
            'handle': handle,
            'offset': offset,
            'data': data
        });

        const adapter = this.getHandleAdapter(handle);
        if (!adapter) {
            return sftpStream.status(reqID, STATUS_CODE.FAILURE);
        }

        return adapter.write(offset, data)
            .then(() => {
                debug('write succeeded');
                return this.stream.status(reqID, STATUS_CODE.OK);
            })
            .catch((err) => {
                debug('write failed', err);
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onREAD(reqID, handle, offset, length) {

        debug('onREAD', {
            'reqID': reqID,
            'offset': offset,
            'length': length
        });

        const adapter = this.getHandleAdapter(handle);
        if (!adapter) {
            return sftpStream.status(reqID, STATUS_CODE.FAILURE);
        }

        return adapter.read(length, offset)
            .then((buf) => {
                return this.stream.data(reqID, buf);
            })
            .catch({
                'code': 'EOF'
            }, () => {
                return this.stream.status(reqID, STATUS_CODE.EOF);
            })
            .catch((err) => {
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onREMOVE(reqID, reqPath) {

        const localPath = this.getLocalPath(reqPath);

        debug('onREMOVE', {
            'reqID': reqID,
            'reqPath': reqPath,
            'localPath': localPath
        });

        if (!this.canWrite(localPath)) {
            return this.stream.status(reqID, STATUS_CODE.FAILURE);
        }

        return fs.unlinkAsync(localPath)
            .then(() => {
                debug('Remove success');
                return this.stream.status(reqID, STATUS_CODE.OK);
            })
            .catch((err) => {
                debug('Remove error', err);
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onMKDIR(reqID, reqPath) {

        const localPath = this.getLocalPath(reqPath);

        debug('onMKDIR', {
            'reqID': reqID,
            'reqPath': reqPath,
            'localPath': localPath
        });

        if (!this.canWrite(localPath)) {
            return this.stream.status(reqID, STATUS_CODE.FAILURE);
        }

        return fs.mkdirAsync(localPath)
            .then(() => {
                debug('Mkdir success');
                return this.stream.status(reqID, STATUS_CODE.OK);
            })
            .catch((err) => {
                debug('Mkdir error', err);
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onRMDIR(reqID, reqPath) {

        const localPath = this.getLocalPath(reqPath);

        debug('onRMDIR', {
            'reqID': reqID,
            'reqPath': reqPath,
            'localPath': localPath
        });

        if (!this.canWrite(localPath)) {
            return this.stream.status(reqID, STATUS_CODE.FAILURE);
        }

        return fs.removeAsync(localPath)
            .then(() => {
                debug('Rmdir success');
                return this.stream.status(reqID, STATUS_CODE.OK);
            })
            .catch((err) => {
                debug('Rmdir error', err);
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

    onRENAME(reqID, oldPath, newPath) {

        debug('onRENAME', {
            'reqID': reqID,
            'oldPath': oldPath,
            'newPath': newPath
        });

        return fs.renameAsync(this.getLocalPath(oldPath), this.getLocalPath(newPath))
            .then(() => {
                return this.stream.status(reqID, STATUS_CODE.OK);
            })
            .catch((err) => {
                debug('Rename error', err);
                return this.stream.status(reqID, STATUS_CODE.FAILURE);
            });

    }

}

module.exports = StreamManager;
