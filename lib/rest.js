'use strict';

const express = require('express');
const _ = require('lodash');
const s = require('underscore.string');
const glob = require('./glob');

module.exports = (server) => {

    const app = express();

    app.use((req, res, next) => {

        if (req.url === '/api/ping') {
            return next();
        }

        if (_.get(req, ['headers', 'x-token']) === server.api_key) {
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
                'cwd': server.dataDirectory
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
