'use strict';

const Promise = require('bluebird');

exports = module.exports = function() {

    const Promise = require('bluebird');
    return Promise.promisify(require('get-folder-size'));

};

exports['@singleton'] = true;
exports['@require'] = [];
