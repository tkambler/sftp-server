'use strict';

exports = module.exports = function(fs, config, glob) {

    const Promise = require('bluebird');
    const path = require('path');

    class File {

        constructor(username, filePath) {
            if (!username) {
                throw new Error(`username is required`);
            }
            if (!filePath) {
                throw new Error(`filePath is required`);
            }
            this.username = username;
            this.filePath = filePath;
        }

        get username() {
            return this._username;
        }

        set username(val) {
            return this._username = val;
        }

        get filePath() {
            return this._filePath;
        }

        set filePath(val) {
            return this._filePath = val;
        }

        get location() {
            return path.resolve(config.get('sftp:dataDirectory'), this.username, this.filePath);
        }

        exists() {
            return fs.statAsync(this.location)
                .then(() => {
                    return true;
                })
                .catch(() => {
                    return false;
                });
        }

        remove() {
            return fs.removeAsync(this.location);
        }

        getReadStream() {
            return fs.createReadStream(this.location);
        }

        stat() {
            return Promise.resolve()
                .then(() => {
                    if (this.stats) {
                        return this.stats;
                    } else {
                        return fs.statAsync(this.location)
                            .then((stats) => {
                                this.stats = stats;
                                return stats;
                            });
                    }
                });
        }

        isDirectory() {
            return this.stat()
                .then((stats) => {
                    return stats.isDirectory();
                });
        }

    }

    return File;

};

exports['@singleton'] = true;
exports['@require'] = ['fs', 'config', 'glob'];
