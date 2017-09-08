'use strict';

module.exports = {
    'username': {
        'get': function() {
            return this._username;
        },
        'set': function(val) {
            return this._username = val;
        }
    },
    'sessions': {
        'get': function() {
            return this._sessions ? this._sessions : this._sessions = [];
        },
        'set': function(val) {
            return this._sessions = val;
        }
    }
};
