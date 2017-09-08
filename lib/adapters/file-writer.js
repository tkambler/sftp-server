'use strict';

const debug = require('debug')('sftp:file-writer');
const Promise = require('bluebird');
const moment = require('moment');
const path = require('path');
const fs = require('../fs');

class FileWriter {

    constructor(streamManager, localPath, flags, attrs) {

        debug('Initializing DirHandler', {
            'localPath': localPath
        });

        this.stream = streamManager.stream;
        this.streamManager = streamManager;
        this.localPath = localPath;
        this.flags = flags;
        this.attrs = attrs;

    }

    get fd() {
        return this._fd;
    }

    set fd(val) {
        return this._fd = val;
    }

    open() {

        debug('open', {
            'localPath': this.localPath,
            'flags': this.flags,
            'attrs': this.attrs
        });

        return new Promise((resolve, reject) => {
            debug('opening...');
            fs.open(this.localPath, this.flags, (err, fd) => {
                debug('fd', fd);
                if (err) {
                    return reject(err);
                } else {
                    this.fd = fd;
                    return resolve();
                }
            });
        });

    }

    close() {
        return Promise.resolve();
    }

    write(offset, data) {

        return Promise.resolve()
            .then(() => {

                debug('write', {
                    'offset': offset,
                    'data': data,
                    'fd': this.fd,
                    'localPath': this.localPath
                });

                if (!this.fd) {
                    throw new Error(`No file descriptor found`);
                }

                if (!this.localPath) {
                    throw new Error(`No localPath found`);
                }

                return new Promise((resolve, reject) => {

                    debug('Writing to file');

                    return fs.write(this.fd, data, 0, Buffer.byteLength(data), offset, (err, bytesWritten, buffer) => {

                        debug(err ? 'Write failure' : 'Write success', {
                            'bytesWritten': bytesWritten
                        });

                        if (err) {
                            return reject(err);
                        } else {
                            return resolve();
                        }

                    });

                });

            });

    }

}

module.exports = FileWriter;
