'use strict';

const debug = require('debug')('sftp:stat-adapter');
const Promise = require('bluebird');
const moment = require('moment');
const path = require('path');
const fs = require('../fs');

class StatAdapter {

    constructor(streamManager, localPath, flags, attrs) {

        debug('Initializing StatAdapter', {
            'localPath': localPath
        });

        this.stream = streamManager.stream;
        this.streamManager = streamManager;
        this.localPath = localPath;
        this.flags = flags;
        this.attrs = attrs;

    }



    close() {
        return Promise.resolve();
    }

}

module.exports = StatAdapter;
