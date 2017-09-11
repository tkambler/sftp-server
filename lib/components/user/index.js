'use strict';

exports = module.exports = function(fs, config, glob, getFolderSize) {

    const Promise = require('bluebird');
    const path = require('path');

    class User {

        constructor(username) {
            if (!username) {
                throw new Error(`username is required`);
            }
            this.username = username;
        }

        get username() {
            return this._username;
        }

        set username(val) {
            return this._username = val;
        }

        get location() {
            return path.resolve(config.get('sftp:dataDirectory'), this.username);
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

        getFiles(filePath = '.') {
            const src = path.resolve(this.location, filePath);
            return glob('*', {
                'cwd': src,
                'dot': true
            })
                .map((file) => {
                    return fs.statAsync(path.resolve(this.location, filePath, file))
                        .then((stats) => {
                            stats.isFile = stats.isFile();
                            stats.isDirectory = stats.isDirectory();
                            return {
                                'file': path.join(filePath, file),
                                'stats': stats
                            };
                        });
                });
        }

        getMeta(filePath = '.') {
            const src = path.resolve(this.location, filePath);
            return fs.statAsync(src)
                .then((stats) => {
                    stats.isFile = stats.isFile();
                    stats.isDirectory = stats.isDirectory();
                    if (!stats.isDirectory) {
                        return stats;
                    }
                    return getFolderSize(src)
                        .then((totalSize) => {
                            stats.totalSize = totalSize;
                            return stats;
                        });
                });
        }

        remove() {
            return fs.removeAsync(this.location);
        }

    }

    return User;

};

exports['@singleton'] = true;
exports['@require'] = ['fs', 'config', 'glob', 'get-folder-size'];
