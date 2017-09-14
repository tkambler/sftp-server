'use strict';

const Promise = require('bluebird');
const moment = require('moment');
const path = require('path');

module.exports = ({ config, log, fs }) => {

    class FileWriter {

        constructor(streamManager, localPath, flags, attrs) {

            log.debug('Initializing DirHandler', {
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

            log.debug('open', {
                'localPath': this.localPath,
                'flags': this.flags,
                'attrs': this.attrs
            });

            return fs.openAsync(this.localPath, this.flags)
                .then((fd) => {
                    this.fd = fd;
                });

        }

        close() {
            return fs.closeAsync(this.fd);
        }

        write(offset, data) {

            return Promise.resolve()
                .then(() => {

                    log.debug('write', {
                        'offset': offset,
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

                        log.debug('Writing to file');

                        return fs.write(this.fd, data, 0, Buffer.byteLength(data), offset, (err, bytesWritten, buffer) => {

                            log.debug(err ? 'Write failure' : 'Write success', {
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

    return FileWriter;

};
