'use strict';

const debug = require('debug')('sftp:client-manager');
const clientExtensions = require('./client-extensions');
const sessionExtensions = require('./session-extensions');
const StreamManager = require('./stream-manager');
const path = require('path');
const fs = require('./fs');

class ClientManager {

    constructor(server) {
        debug('Initializing client manager');
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
        debug('Client connected');
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
        return this.server.auth(authContext.username, authContext.password)
            .then(() => {
                return fs.ensureDirAsync(path.resolve(this.server.dataDirectory, authContext.username));
            })
            .then(() => {
                this.server.emit('login', {
                    'username': authContext.username
                });
                this.server.log.info('User signed in', {
                    'username': authContext.username
                });
                client.username = authContext.username;
                return authContext.accept();
            })
            .catch(authContext.reject.bind(authContext));
    }

    onReady(client) {
        debug('Client has authenticated', { 'username': client.username });
        client.on('session', (accept, reject) => {
            return this.onSession(client, accept, reject);
        });
    }

    onEnd(client) {
        debug('Client disconnected');
    }

    onSession(client, accept, reject) {
        debug('New client session', { 'username': client.username });
        let session = accept();
        Object.defineProperties(session, sessionExtensions);
        client.sessions.push(session);
        session.on('sftp', (accept, reject) => {
            return this.onSFTP(client, accept, reject);
        });
    }

    onSFTP(client, accept, reject) {
        debug('New SFTP connection', { 'username': client.username });
        const streamManager = new StreamManager(this, client, accept());
        this.streamManagers.push(streamManager);
    }

}

module.exports = ClientManager;
