'use strict';

const winston = require('winston');
const fs = require('./fs');
const path = require('path');
const _ = require('lodash');
const debug = require('debug')('sftp:log');
require('winston-daily-rotate-file');

module.exports = (server) => {

    const logger = new winston.Logger();

    logger.setLevels({
        'error': 0,
        'warn': 1,
        'info': 2,
        'debug': 3,
        'trace': 4
    });

    if (_.get(server, 'log.console.enabled')) {
        debug('Enabling console-based logging');
        logger.add(winston.transports.Console, {
            'json': true,
            'timestamp': true,
            'stringify': true
        });
    }

    if (_.get(server, 'log.file.enabled')) {
        if (!_.get(server, 'log.file.filename')) {
            throw new Error(`A filename must be specified when enabling file-based logging.`);
        }
        const logDir = path.dirname(_.get(server, 'log.file.filename'));
        debug('Enabling file-based logging', {
            'directory': logDir,
            'file': _.get(server, 'log.file.filename')
        });
        fs.ensureDirSync(logDir);
        logger.add(winston.transports.DailyRotateFile, {
            'json': true,
            'timestamp': true,
            'stringify': true,
            'filename': _.get(server, 'log.file.filename'),
            'datePattern': 'yyyy-MM-dd.',
            'prepend': true,
            'level': 'info'
        });
    }

    logger.stream = {
        'write': function(msg, enc) {
        }
    };

    return logger;

};
