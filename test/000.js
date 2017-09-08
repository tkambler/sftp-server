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

describe('SFTP Server', function() {

    this.timeout(5000);

    before(function(done) {
        fs.removeAsync(targetDataDir)
            .then(() => {
                return fs.copyAsync(srcDataDir, targetDataDir);
            })
            .then(() => {
                server.on('listening', () => {
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
