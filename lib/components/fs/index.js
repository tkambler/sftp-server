'use strict';

const Promise = require('bluebird');

exports = module.exports = function() {

    const Promise = require('bluebird');
    return Promise.promisifyAll(require('fs-extra'));

};

exports['@singleton'] = true;
exports['@require'] = [];
