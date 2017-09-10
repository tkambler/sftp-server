'use strict';

const _ = require('lodash');

module.exports = (options) => {

    _.defaultsDeep(options, {
        'sftp': {
            'address': '0.0.0.0',
            'port': 3333,
            'algorithms': {
                'compression': ['none']
            }
        },
        'api': {
            'address': '0.0.0.0',
            'port': 9000
        }
    });

    const IoC = require('electrolyte');
    const { Container } = IoC;
    const container = new Container();
    const path = require('path');
    container.use(IoC.dir(path.resolve(__dirname, 'components')));

    return container.create('config')
        .then((config) => {
            config.use(options);
            return container.create('server');
        });

};
