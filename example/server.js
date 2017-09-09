'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const SFTPServer = require('../');
const path = require('path');
const debug = require('debug')('sftp:instance');

const server = new SFTPServer({
    'port': 3333,
    'hostKeys': [
        fs.readFileSync(__dirname + '/host_rsa')
    ],
    'dataDirectory': path.resolve(__dirname, '../data'),
    'auth': function(username, password) {
        return Promise.resolve()
            .then(() => {
                if (username !== 'foo' || password !== 'bar') {
                    throw new Error();
                }
            });
    },
    'api_port': 8000,
    'api_key': 'yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM',
    'log': {
        'console': {
            'enabled': false
        },
        'file': {
            'enabled': true,
            'filename': '/var/log/sftp-server/log.json'
        }
    }
});

server.on('listening', (data) => {
    debug('listening', data);
});

server.on('login', (data) => {
    debug('login', data);
});

server.on('upload_complete', (data) => {
    debug('upload_complete', data);
});

server.on('ready', () => {
    debug('server is ready');
});

server.listen();
