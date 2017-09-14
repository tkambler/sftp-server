'use strict';

const SFTPStream  = require('ssh2-streams').SFTPStream;
const sftpStreamExtensions = require('./sftp-stream-extensions');
const sftpEvents = require('./sftp-events');
const _ = require('lodash');
const ssh2 = require('ssh2');
const STATUS_CODE = ssh2.SFTP_STATUS_CODE;
const path = require('path');
const moment = require('moment');

exports = module.exports = function(fs, config, log) {

    const DirAdapter = require('./adapters/dir')({ 'fs': fs, 'config': config, 'log': log });
    const FileReader = require('./adapters/file-reader')({ 'fs': fs, 'config': config, 'log': log });
    const FileWriter = require('./adapters/file-writer')({ 'fs': fs, 'config': config, 'log': log });

    class StreamManager {

        constructor(clientManager, client, stream) {

            log.debug('Initializing StreamManager');

            this.clientManager = clientManager;
            this.server = clientManager.server;
            this.client = client;
            this.stream = stream;
            Object.defineProperties(this.stream, sftpStreamExtensions);
            sftpEvents.forEach((event) => {
                const fn = `on${event}`;
                this.stream.on(event, (...args) => {
                    const [ reqID ] = args;
                    if (_.isFunction(this[fn])) {
                        return this[fn].apply(this, args);
                    } else {
                        log.debug(`Unsupported stream event: ${event}`);
                        return this.sendStatus(reqID, STATUS_CODE.FAILURE);
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

        sendStatus(reqID, status) {
            if (!this.stream.status(reqID, status)) {
                this.stream.once('continue', () => {
                    this.sendStatus(reqID, status);
                });
            }
        }

        sendHandle(reqID, handle) {
            if (!this.stream.handle(reqID, handle)) {
                this.stream.once('continue', () => {
                    this.sendHandle(reqID, handle);
                });
            }
        }

        sendData(reqID, data) {
            if (!this.stream.data(reqID, data)) {
                this.stream.once('continue', () => {
                    this.sendData(reqID, data);
                });
            }
        }

        sendName(reqID, data) {
            if (!this.stream.name(reqID, data)) {
                this.stream.once('continue', () => {
                    this.sendName(reqID, data);
                });
            }
        }

        /**
         * Given a filepath provided by the client, return the corresponding absolute path to a file on the
         * server (beneath the requesting user's directory).
         */
        getLocalPath(reqPath) {
            return path.join(config.get('sftp:dataDirectory'), this.client.username, reqPath);
        }

        getRelativeUserPath(p) {
            return path.relative(path.resolve(config.get('sftp:dataDirectory'), this.client.username), p);
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

            log.debug('onREALPATH', {
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
                    log.debug('Records', records);
                    return this.sendName(reqID, records);
                });

        }

        onOPENDIR(reqID, reqPath) {

            log.debug('onOPENDIR', {
                'reqID': reqID,
                'reqPath': reqPath
            });

            const handle = new Buffer(4);
            const handlerID = this.generateHandlerID();
            handle.writeUInt32BE(handlerID, 0);
            const adapter = new DirAdapter(this, reqPath);
            this.setAdapter(handlerID, adapter);
            this.sendHandle(reqID, handle);

        }

        onREADDIR(reqID, handle) {

            log.debug('onREADDIR', {
                'reqID': reqID
            });

            const adapter = this.getHandleAdapter(handle);
            if (!adapter) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            return adapter.readdir()
                .then((names) => {
                    log.debug('READDIR success');
                    return this.sendName(reqID, names);
                })
                .catch({
                    'code': 'EOF'
                }, () => {
                    log.debug('READDIR EOF');
                    return this.sendStatus(reqID, STATUS_CODE.EOF);
                })
                .catch((err) => {
                    log.debug('READDIR error', err);
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onDISCONNECT(reason, code, description) {
            log.info('Disconnect', {
                'reason': reason,
                'code': code,
                'description': description
            });
        }

        onCLOSE(reqID, handle) {

            log.debug('onCLOSE', {
                'reqID': reqID
            });

            const adapter = this.getHandleAdapter(handle);
            if (!adapter) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            if (adapter instanceof FileWriter) {
                log.info('Upload complete', {
                    'username': this.client.username,
                    'file': {
                        'absolute': adapter.localPath,
                        'relative': this.getRelativeUserPath(adapter.localPath)
                    }
                });
                this.server.emit('upload_complete', {
                    'username': this.client.username,
                    'file': {
                        'absolute': adapter.localPath,
                        'relative': this.getRelativeUserPath(adapter.localPath)
                    }
                });
            }

            return adapter.close()
                .then(() => {
                    return this.sendStatus(reqID, STATUS_CODE.OK);
                })
                .catch(() => {
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onOPEN(reqID, filename, flags, attrs) {

            const localPath = this.getLocalPath(filename);

            log.debug('onOPEN', {
                'reqID': reqID,
                'filename': filename,
                'localPath': localPath,
                'flags': flags
            });

            let adapter;
            flags = SFTPStream.flagsToString(flags);

            log.debug('flags', flags);

            switch (flags) {
                case 'r':
                    if (!this.canRead(localPath)) {
                        return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                    }
                    adapter = new FileReader(this, localPath, flags, attrs);
                break;
                case 'w':
                    if (!this.canWrite(localPath)) {
                        return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                    }
                    adapter = new FileWriter(this, localPath, flags, attrs);
                break;
                default:
                    log.debug('Unknown flags', flags);
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            const handle = new Buffer(4);
            const handlerID = this.generateHandlerID();
            handle.writeUInt32BE(handlerID, 0);
            this.setAdapter(handlerID, adapter);

            return adapter.open()
                .then(() => {
                    log.debug('sending handle');
                    return this.sendHandle(reqID, handle);
                })
                .catch(() => {
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onSTAT(reqID, path) {

            const localPath = this.getLocalPath(path);

            log.debug('onSTAT', {
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
                    this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onWRITE(reqID, handle, offset, data) {

            log.debug('onWRITE', {
                'reqID': reqID,
                'handle': handle,
                'offset': offset
            });

            if (!this.client.can('WRITE')) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            const adapter = this.getHandleAdapter(handle);
            if (!adapter) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            return adapter.write(offset, data)
                .then(() => {
                    return this.sendStatus(reqID, STATUS_CODE.OK);
                })
                .catch((err) => {
                    log.error('Write failed', err);
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onREAD(reqID, handle, offset, length) {

            log.debug('onREAD', {
                'reqID': reqID,
                'offset': offset,
                'length': length
            });

            if (!this.client.can('READ')) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            const adapter = this.getHandleAdapter(handle);
            if (!adapter) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            return adapter.read(length, offset)
                .then((buf) => {
                    return this.sendData(reqID, buf);
                })
                .catch({
                    'code': 'EOF'
                }, () => {
                    return this.sendStatus(reqID, STATUS_CODE.EOF);
                })
                .catch((err) => {
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onREMOVE(reqID, reqPath) {

            const localPath = this.getLocalPath(reqPath);

            log.debug('onREMOVE', {
                'reqID': reqID,
                'reqPath': reqPath,
                'localPath': localPath
            });

            if (!this.client.can('REMOVE')) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            if (!this.canWrite(localPath)) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            return fs.unlinkAsync(localPath)
                .then(() => {
                    log.debug('Remove success');
                    this.server.emit('remove', {
                        'username': this.client.username,
                        'directory': {
                            'absolute': localPath,
                            'relative': reqPath
                        }
                    });
                    return this.sendStatus(reqID, STATUS_CODE.OK);
                })
                .catch((err) => {
                    log.debug('Remove error', err);
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onMKDIR(reqID, reqPath) {

            const localPath = this.getLocalPath(reqPath);

            log.debug('onMKDIR', {
                'reqID': reqID,
                'reqPath': reqPath,
                'localPath': localPath
            });

            if (!this.client.can('MKDIR')) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            if (!this.canWrite(localPath)) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            return fs.mkdirAsync(localPath)
                .then(() => {
                    log.debug('Mkdir success');
                    this.server.emit('mkdir', {
                        'username': this.client.username,
                        'directory': {
                            'absolute': localPath,
                            'relative': reqPath
                        }
                    });
                    return this.sendStatus(reqID, STATUS_CODE.OK);
                })
                .catch((err) => {
                    log.debug('Mkdir error', err);
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onRMDIR(reqID, reqPath) {

            const localPath = this.getLocalPath(reqPath);

            log.debug('onRMDIR', {
                'reqID': reqID,
                'reqPath': reqPath,
                'localPath': localPath
            });

            if (!this.client.can('RMDIR')) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            if (!this.canWrite(localPath)) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            return fs.removeAsync(localPath)
                .then(() => {
                    log.debug('Rmdir success');
                    this.server.emit('rmdir', {
                        'username': this.client.username,
                        'directory': {
                            'absolute': localPath,
                            'relative': reqPath
                        }
                    });
                    return this.sendStatus(reqID, STATUS_CODE.OK);
                })
                .catch((err) => {
                    log.debug('Rmdir error', err);
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

        onRENAME(reqID, oldPath, newPath) {

            log.debug('onRENAME', {
                'reqID': reqID,
                'oldPath': oldPath,
                'newPath': newPath
            });

            if (!this.client.can('RENAME')) {
                return this.sendStatus(reqID, STATUS_CODE.FAILURE);
            }

            return fs.renameAsync(this.getLocalPath(oldPath), this.getLocalPath(newPath))
                .then(() => {
                    this.server.emit('rename', {
                        'username': this.client.username,
                        'old': {
                            'absolute': this.getLocalPath(oldPath),
                            'relative': oldPath
                        },
                        'new': {
                            'absolute': this.getLocalPath(newPath),
                            'relative': newPath
                        }
                    });
                    return this.sendStatus(reqID, STATUS_CODE.OK);
                })
                .catch((err) => {
                    log.debug('Rename error', err);
                    return this.sendStatus(reqID, STATUS_CODE.FAILURE);
                });

        }

    }

    return StreamManager;

};

exports['@singleton'] = true;
exports['@require'] = ['fs', 'config', 'log'];
