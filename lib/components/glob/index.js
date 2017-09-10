'use strict';

exports = module.exports = function() {

    return require('bluebird').promisify(require('glob'));

};

exports['@singleton'] = true;
exports['@require'] = [];
