'use strict';

const express = require('express');
const _ = require('lodash');
const s = require('underscore.string');

exports = module.exports = function(config, log, glob) {

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
                return next(err);
            }
        });

        app.use((err, req, res, next) => {
            return res.status(500).end();
        });

        app.route('/api/ping')
            .get((req, res, next) => {
                return res.send({ 'response': 'pong '});
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
                    });
            });

        module.exports = app;

        return app;

    };

};

exports['@singleton'] = true;
exports['@require'] = ['config', 'log', 'glob'];
