'use strict';
/* global mocha, describe, it */

const Client = require('ssh2').Client;
const assert = require('assert');
const host = '127.0.0.1';
const port = 4000;
const username = 'foo';
const password = 'bar';
const server = require('./lib/server');
const _ = require('lodash');
const fs = require('../lib/fs');
const path = require('path');
const srcDataDir = path.resolve(__dirname, 'resources/data');
const targetDataDir = path.resolve(__dirname, 'data');
const request = require('request-promise');
const req = request.defaults({
    'baseUrl': 'http://127.0.0.1:8000',
    'json': true,
    'headers': {
        'x-token': 'yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM'
    }
});

describe('Test Suite', function() {

    this.timeout(5000);

    before(function(done) {
        fs.removeAsync(targetDataDir)
            .then(() => {
                return fs.copyAsync(srcDataDir, targetDataDir);
            })
            .then(() => {
                server.on('ready', () => {
                    return done();
                });
                server.listen();
            });
    });

    after(function(done) {
        fs.removeAsync(targetDataDir)
            .then(() => {
                return done();
            });
    });

    describe('SFTP Server', function() {

        it('Should connect when given the correct username / password', function(done) {

            const conn = new Client();

            conn.on('ready', () => {
                return done();
            });

            conn.connect({
                'host': host,
                'port': port,
                'username': username,
                'password': password
            });

        });

        it('Should fail to connect when given the wrong username / password', function(done) {

            const conn = new Client();

            conn.on('ready', () => {
                return done('Connection established');
            });

            conn.on('error', (err) => {
                return done();
            });

            conn.connect({
                'host': host,
                'port': port,
                'username': username,
                'password': 'meh'
            });

        });

        it('Should list files', function(done) {

            const conn = new Client();

            conn.on('ready', () => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        return done(err);
                    }
                    return sftp.readdir('.', (err, list) => {
                        if (err) {
                            return done(err);
                        }
                        assert(list.length === 1);
                        assert(_.find(list, { 'filename': 'hello-world.txt' }))
                        conn.end();
                        done();
                    });
                });

            });

            conn.connect({
                'host': host,
                'port': port,
                'username': username,
                'password': password
            });

        });

        it('Should allow you to upload files', function(done) {

            const conn = new Client();

            conn.on('ready', () => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        return done(err);
                    }
                    return sftp.fastPut(path.resolve(__dirname, 'resources/misc/foo.txt'), '/foo.txt', (err) => {
                        if (err) {
                            return done(err);
                        }
                        return sftp.readdir('.', (err, list) => {
                            if (err) {
                                return done(err);
                            }
                            assert(list.length === 2);
                            assert(_.find(list, { 'filename': 'foo.txt' }))
                            conn.end();
                            done();
                        });
                    });
                });

            });

            conn.connect({
                'host': host,
                'port': port,
                'username': username,
                'password': password
            });

        });

    });

    describe('REST API', function() {

        it('Should pong', function() {
            return req.get('/api/ping');
        });

        it('Should prevent access when a bad token is passed', function() {
            return request.get('/api/users', {
                'baseUrl': 'http://127.0.0.1:8000',
                'json': true,
                'headers': {
                    'x-token': 'foobar'
                }
            })
                .then(() => {
                    throw new Error();
                })
                .catch({
                    'name': 'StatusCodeError'
                }, () => {
                });
        });

        it('Should list users', function() {
            return req.get('/api/users')
                .then((users) => {
                    assert(_.isEqual(users, ['foo']));
                });
        });

    });

});
