'use strict';

const Promise = require('bluebird');
const path = require('path');

exports = module.exports = function(config, log, fs, glob, getFolderSize) {

    class System {

        getUserCount() {
            return glob('*/', {
                'cwd': config.get('sftp:dataDirectory')
            })
                .then((res) => {
                    return res.length;
                });
        }

        getTotalStorage() {
            return getFolderSize(config.get('sftp:dataDirectory'));
        }

    }

    return new System();

};

exports['@singleton'] = true;
exports['@require'] = ['config', 'log', 'fs', 'glob', 'get-folder-size'];
