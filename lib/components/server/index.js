'use strict';

const ssh2 = require('ssh2');
const _ = require('lodash');
const SFTPStream  = require('ssh2-streams').SFTPStream;
const path = require('path');
const { EventEmitter2 } = require('eventemitter2');

exports = module.exports = function(config, log, fs, ClientManager, api) {

    class SFTPServer extends EventEmitter2 {

        init() {
            return Promise.resolve()
                .then(() => {
                    return fs.ensureDirAsync(config.get('sftp:dataDirectory'));
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

                    this.server = new ssh2.Server({
                        'hostKeys': config.get('sftp:hostKeys'),
                        'algorithms': config.get('sftp:algorithms')
                    }, (client) => {
                        this.clientManager.track(client);
                    });

                    this.rest = api(this);

                    this.server.listen(config.get('sftp:port'), config.get('sftp:address'), function() {
                        const address = this.address();
                        log.info('SFTP server is listening', {
                            'address': address.address,
                            'port': address.port
                        });
                        self.emit('listening', {
                            'address': address.address,
                            'port': address.port
                        });
                        self.rest.listen(config.get('api:port'), () => {
                            log.info('REST API is listening', {
                                'port': config.get('api:port')
                            });
                            self.emit('api_listening', {
                                'port': config.get('api:port')
                            });
                            self.emit('ready');
                            log.info('Server is ready');
                        });
                    });

                });

        }

    }

    return new SFTPServer();

};

exports['@singleton'] = true;
exports['@require'] = ['config', 'log', 'fs', 'client-manager', 'api'];
