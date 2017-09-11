'use strict';

const Promise = require('bluebird');
const clientExtensions = require('./client-extensions');
const sessionExtensions = require('./session-extensions');
const path = require('path');
const _ = require('lodash');

exports = module.exports = function(fs, config, StreamManager, log) {

    class ClientManager {

        constructor(server) {
            log.debug('Initializing client manager');
            this.server = server;
        }

        get clients() {
            return this._clients ? this._clients : this._clients = [];
        }

        get streamManagers() {
            return this._streamManagers ? this._streamManagers : this._streamManagers = [];
        }

        set setStreamManagers(val) {
            return this._streamManagers = val;
        }

        track(client) {
            log.debug('Client connected');
            Object.defineProperties(client, clientExtensions);
            client
                .on('authentication', (authContext) => {
                    return this.onAuthenticate(client, authContext);
                })
                .on('ready', () => {
                    return this.onReady(client);
                })
                .on('end', () => {
                    return this.onEnd(client);
                });
            this.clients.push(client);
        }

        onAuthenticate(client, authContext) {
            if (authContext.method !== 'password') {
                return authContext.reject();
            }
            return config.get('sftp:auth')(authContext.username, authContext.password)
                .then((authRes) => {
                    authRes = _.isPlainObject(authRes) ? authRes : {};
                    _.defaultsDeep(authRes, {
                        'permissions': {}
                    });
                    client.permissions = authRes.permissions;
                    return fs.ensureDirAsync(path.resolve(config.get('sftp:dataDirectory'), authContext.username));
                })
                .then(() => {
                    this.server.emit('login', {
                        'username': authContext.username
                    });
                    log.info('User signed in', {
                        'username': authContext.username
                    });
                    client.username = authContext.username;
                    return authContext.accept();
                })
                .catch(authContext.reject.bind(authContext));
        }

        onReady(client) {
            log.debug('Client has authenticated', { 'username': client.username });
            client.on('session', (accept, reject) => {
                return this.onSession(client, accept, reject);
            });
        }

        onEnd(client) {
            log.debug('Client disconnected');
        }

        onSession(client, accept, reject) {
            log.debug('New client session', { 'username': client.username });
            let session = accept();
            Object.defineProperties(session, sessionExtensions);
            client.sessions.push(session);
            session.on('sftp', (accept, reject) => {
                return this.onSFTP(client, accept, reject);
            });
        }

        onSFTP(client, accept, reject) {
            log.debug('New SFTP connection', { 'username': client.username });
            const streamManager = new StreamManager(this, client, accept());
            this.streamManagers.push(streamManager);
        }

    }

    return ClientManager;

};

exports['@singleton'] = true;
exports['@require'] = ['fs', 'config', 'stream-manager', 'log'];
