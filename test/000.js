'use strict';
/* global mocha, describe, it */

const Client = require('ssh2').Client;
const assert = require('assert');
const host = '127.0.0.1';
const port = 4000;
const username = 'foo';
const password = 'bar';
const server = require('./lib/server');
const fs = require('../lib/fs');
const path = require('path');
const srcDataDir = path.resolve(__dirname, 'resources/data');
const targetDataDir = path.resolve(__dirname, 'data');

describe('Foo', function() {

    this.timeout(5000);

    before(function(done) {
        fs.copyAsync(srcDataDir, targetDataDir)
            .then(() => {
                server.on('listening', () => {
                    return done();
                });
                server.listen();
            });
    });

    describe('Bar', function() {

        it('Should herp', function(done) {

            const conn = new Client();

            conn.on('ready', function() {

                console.log('Client :: ready');
                conn.sftp(function(err, sftp) {
                    if (err) throw err;
                    sftp.readdir('.', function(err, list) {
                        if (err) throw err;
                        console.dir(list);
                        conn.end();
                        done();
                    });
                });

            });

            conn.connect({
                host: host,
                port: port,
                username: username,
                password: password
            });

        });

    });

});
