'use strict';

exports = module.exports = function() {

    const Promise = require('bluebird');
    const handlers = require('shortstop-handlers');
    let confit = require('confit');

    confit = Promise.promisifyAll(confit({
        'protocols': {
            'env': handlers.env()
        }
    }));

    return confit.createAsync();

};

exports['@singleton'] = true;
exports['@require'] = [];
