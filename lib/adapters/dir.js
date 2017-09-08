'use strict';

const debug = require('debug')('sftp:dir-adapter');
const Promise = require('bluebird');
const moment = require('moment');
const path = require('path');
const fs = require('../fs');
const _ = require('lodash');

class DirAdapter {

    constructor(streamManager, reqPath) {

        debug('Initializing DirAdapter', {
            'reqPath': reqPath
        });

        this.stream = streamManager.stream;
        this.streamManager = streamManager;
        this.reqPath = reqPath;

    }

    readdir() {

        const localPath = this.streamManager.getLocalPath(this.reqPath);

        debug('readdir', {
            'reqPath': this.reqPath,
            'localPath': localPath
        });

        return Promise.resolve()
            .then(() => {

                if (this.hasRead) {
                    let err = new Error();
                    err.code = 'EOF';
                    throw err;
                }

                this.hasRead = true;

                return fs.readdirAsync(localPath)
                    .map((file) => {
                        const abs = path.resolve(localPath, file);
                        return fs.statAsync(abs)
                            .then((stats) => {
                                return {
                                    'filename': file,
                                    'absolute_path': abs,
                                    'stats': stats
                                };
                            });
                    })
                    .map((row) => {
//                         debug('row', row);
                        let typeFlag;
                        if (row.stats.isDirectory()) {
                            typeFlag = 'd';
                        } else if (row.stats.isFile()) {
                            typeFlag = '-';
                        } else {
                            debug('Unknown record type', row);
                            return;
                        }
                        return {
                            'filename': path.relative(localPath, row.absolute_path),
                            'longname': `${typeFlag}rw------- ${row.stats.nlink} ${this.streamManager.client.username} ${this.streamManager.client.username} ${row.stats.size} ${moment(row.stats.mtime).format('MMM D H:mm')} ${row.filename}`,
                            'attrs': {
                                'mode': row.stats.isFile() ? '0600' : (0o600 | fs.constants.S_IFDIR),
                                'size': row.stats.size,
                                'atime': moment(row.stats.atime).format('x') / 1000,
                                'mtime': moment(row.stats.mtime).format('x') / 1000,
                            }
                        };
                    })
                    .then((rows) => {
                        return _.compact(rows);
                    })
                    .tap((rows) => {
//                         console.log(JSON.stringify(rows, null, 4));
                        debug('readdir results', { 'files': JSON.stringify(rows, null, 4) });
                    });

            });

    }

    close() {
        return Promise.resolve();
    }

}

module.exports = DirAdapter;
