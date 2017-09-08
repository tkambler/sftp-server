'use strict';

module.exports = {
    'sftpStreams': {
        'get': function() {
            return this._sftpStreams ? this._sftpStreams : this._sftpStreams = [];
        },
        'set': function(val) {
            return this._sftpStream = val;
        }
    }
};
