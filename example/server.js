'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const SFTPServer = require('../');
const path = require('path');

const server = require('../')({
    'sftp': {
        'port': 3333,
        'hostKeys': [
            fs.readFileSync(__dirname + '/host_rsa').toString('utf8')
        ],
        'dataDirectory': path.resolve(__dirname, '../data'),
        'auth': function(username, password) {
            return Promise.resolve()
                .then(() => {
                    if (username !== 'foo' || password !== 'bar') {
                        throw new Error();
                    }
                });
        }
    },
    'api': {
        'port': 8000,
        'key': 'yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM'
    },
    'log': {
        'console': {
            'enabled': true
        },
        'file': {
            'enabled': false,
            'filename':path.resolve(__dirname, 'log/sftp-server.log')
        }
    }
})
    .then((server) => {

        server.on('listening', (data) => {
            // ...
        });

        server.on('login', (data) => {
            // ...
        });

        server.on('upload_complete', (data) => {
            // ...
        });

        server.on('ready', () => {
            // ...
        });

        server.listen();

    })
    .catch((err) => {
        console.log('err', err);
        throw err;
    });
