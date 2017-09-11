'use strict';

const winston = require('winston');
const path = require('path');
const _ = require('lodash');
require('winston-daily-rotate-file');

exports = module.exports = function(config, fs) {

    const logger = new winston.Logger();

    logger.setLevels({
        'error': 0,
        'warn': 1,
        'info': 2,
        'debug': 3,
        'trace': 4
    });

    if (config.get('log:console:enabled')) {
        logger.add(winston.transports.Console, {
            'json': true,
            'timestamp': true,
            'stringify': true
        });
    }

    if (config.get('log:file:enabled')) {
        if (!config.get('log:file:filename')) {
            throw new Error(`A filename must be specified when enabling file-based logging.`);
        }
        const logDir = path.dirname(config.get('log:file:filename'));
        console.log('logDir', logDir);
        console.log('filename', config.get('log:file:filename'));
        fs.ensureDirSync(logDir);
        logger.add(winston.transports.DailyRotateFile, {
            'json': true,
            'timestamp': true,
            'stringify': true,
            'filename': config.get('log:file:filename'),
            'datePattern': 'yyyy-MM-dd.',
            'prepend': true,
            'level': 'info'
        });
    }

    logger.stream = {
        'write': function(msg, enc) {
        }
    };

    if (config.get('env:development')) {
        _.each(logger.transports, (transport) => {
            transport.level = 'debug';
        });
    }

    return logger;

};

exports['@singleton'] = true;
exports['@require'] = ['config', 'fs'];
