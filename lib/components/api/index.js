'use strict';

const express = require('express');
const Promise = require('bluebird');
const _ = require('lodash');
const s = require('underscore.string');

exports = module.exports = function(config, log, glob, User, File, system) {

    return () => {

        const app = express();
        app.use((req, res, next) => {
            if (req.url === '/api/ping') {
                return next();
            }
            if (_.get(req, ['headers', 'x-token']) === config.get('api:key')) {
                return next();
            } else {
                const err = new Error();
                err.code = 'AUTHFAIL';
                err.statusCode = 403;
                return next(err);
            }
        });

        app.use((err, req, res, next) => {

            log.error(err);

            if (err.statusCode) {
                res.status(err.statusCode).send(err.message).end();
            }

            switch (err.code) {

                case 'USER404':
                    return res.status(404).end();
                break;

                default:
                    res.status(500).end();
                break;

            }

        });

        app.param('username', (req, res, next, id) => {
            req.user = new User(id);
            return req.user.exists()
                .then((exists) => {
                    if (exists) {
                        return next();
                    } else {
                        const err = new Error(`User does not exist: ${id}`);
                        err.code = 'USER404';
                        return next(err);
                    }
                })
                .catch(next);
        });

        app.param('userFile', (req, res, next, id) => {
            // TODO - Verify that requested file exists beneath specified user's
            // data folder. Security hole exists here.
            if (!req.user) {
                return next(new Error(`username is required`));
            }
            req.userFile = new File(req.user.username, id);
            return req.userFile.exists()
                .then((exists) => {
                    if (exists) {
                        return next();
                    } else {
                        const err = new Error(`File does not exist: ${id}`);
                        err.code = 'USERFILE404';
                        return next(err);
                    }
                })
                .catch(next);
        });

        app.route('/api/ping')
            .get((req, res, next) => {
                return res.send({ 'response': 'pong '});
            });

        app.route('/api/system/meta')
            .get((req, res, next) => {
                return Promise.props({
                    'totalUsers': (() => {
                        return system.getUserCount();
                    })(),
                    'totalStorage': (() => {
                        return system.getTotalStorage();
                    })()
                })
                    .then(res.send.bind(res));
            });

        app.route('/api/users')
            .get((req, res, next) => {
                return glob('*/', {
                    'cwd': config.get('sftp:dataDirectory')
                })
                    .map((user) => {
                        return s.trim(user, '/');
                    })
                    .then((users) => {
                        return res.send(users);
                    })
                    .catch(next);
            });

        app.route('/api/users/:username/files')
            .get((req, res, next) => {
                return Promise.resolve()
                    .then(() => {
                        if (req.query.meta) {
                            return req.user.getMeta();
                        } else {
                            return req.user.getFiles();
                        }
                    })
                    .then(res.send.bind(res))
                    .catch(next);
            });

        app.route('/api/users/:username/files/:userFile(*)')
            .get((req, res, next) => {
                if (req.query.meta) {
                    return req.user.getMeta(req.userFile.filePath)
                        .then(res.send.bind(res));
                } else {
                    return req.userFile.isDirectory()
                        .then((isDir) => {
                            if (isDir) {
                                return req.user.getFiles(req.userFile.filePath)
                                    .then(res.send.bind(res));
                            } else {
                                return req.userFile.getReadStream().pipe(res);
                            }
                        })
                        .catch(next);
                }
            })
            .delete((req, res, next) => {
                return req.userFile.remove()
                    .then(() => {
                        return res.status(200).end();
                    })
                    .catch(next);
            });

        module.exports = app;

        return app;

    };

};

exports['@singleton'] = true;
exports['@require'] = ['config', 'log', 'glob', 'user', 'file', 'system'];
