'use strict';

const Promise = require('bluebird');
const moment = require('moment');
const path = require('path');

module.exports = ({ config, log, fs }) => {

    class FileReader {

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

        read(length, offset) {

            return Promise.resolve()
                .then(() => {

                    log.debug('FileAPIAdapter.read()', {
                        'length': length,
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

                    return fs.statAsync(this.localPath);

                })
                .then((stats) => {

                    log.debug('stats', stats);

                    if (offset >= stats.size) {
                        let err = new Error();
                        err.code = 'EOF';
                        throw err;
                    }

                    let bufferLength;
                    const remainingBytes = stats.size - offset;
                    log.debug('remainingBytes', remainingBytes);

                    if (remainingBytes > length) {
                        bufferLength = length;
                    } else {
                        bufferLength = remainingBytes;
                    }

                    log.debug('bufferLength', bufferLength);

                    const buf = new Buffer(bufferLength);
                    return fs.readAsync(this.fd, buf, 0, bufferLength, offset)
                        .return(buf);

                });

        }

    }

    return FileReader;

}
