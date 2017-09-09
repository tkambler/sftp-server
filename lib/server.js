'use strict';

const debug = require('debug')('sftp:server');
const ssh2 = require('ssh2');
const _ = require('lodash');
const SFTPStream  = require('ssh2-streams').SFTPStream;
const ClientManager = require('./client-manager');
const path = require('path');
const fs = require('./fs');
const { EventEmitter2 } = require('eventemitter2');

class SFTPServer extends EventEmitter2 {

    constructor(options = {}) {
        super();
        _.each(options, (v, k) => {
            this[k] = v;
        });
        this.log = require('./log')(this);
    }

    get address() {
        return this._address ? this._address : this._address = '0.0.0.0';
    }

    set address(val) {
        return this._address = val;
    }

    get algorithms() {
        return this._algorithms ? this._algorithms : this._algorithms = {
            'compress': ['none']
        }
    }

    set algorithms(val) {
        return this._algorithms = val;
    }

    get dataDirectory() {
        return this._dataDirectory;
    }

    set dataDirectory(val) {
        if (!path.isAbsolute(val)) {
            throw new Error(`dataDirectory must be specified as an absolute path`);
        }
        debug('Setting dataDirectory', val);
        return this._dataDirectory = val;
    }

    init() {
        return Promise.resolve()
            .then(() => {
                if (!this.dataDirectory) {
                    throw new Error(`dataDirectory is required`);
                }
                return fs.ensureDirAsync(this.dataDirectory);
            });
    }

    listen() {

        const self = this;

        if (this.server) {
            throw new Error(`listen() has already been called`);
        }

        return this.init()
            .then(() => {

                this.clientManager = new ClientManager(this);

                const options = {
                    'hostKeys': this.hostKeys,
                    'algorithms': this.algorithms
                };

                debug('Server options', options);

                this.server = new ssh2.Server(options, (client) => {
                    this.clientManager.track(client);
                });

                debug('Starting server', {
                    'port': this.port,
                    'address': this.address
                });

                this.rest = require('./rest')(this);

                this.server.listen(this.port, this.address, function() {
                    const address = this.address();
                    debug('SFTP Server is listening', {
                        'address': address.address,
                        'port': address.port
                    });
                    self.log.info('SFTP server is listening', {
                        'address': address.address,
                        'port': address.port
                    });
                    self.emit('listening', {
                        'address': address.address,
                        'port': address.port
                    });
                    self.rest.listen(self.api_port, () => {
                        debug('REST API is listening', {
                            'port': self.api_port
                        });
                        self.log.info('REST API is listening', {
                            'port': self.api_port
                        });
                        self.emit('api_listening', {
                            'port': self.api_port
                        });
                        self.emit('ready');
                        self.log.info('Server is ready');
                    });
                });

            });

    }

}

module.exports = SFTPServer;
