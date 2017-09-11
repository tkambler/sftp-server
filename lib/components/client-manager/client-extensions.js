'use strict';

const _ = require('lodash');

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
    },
    'permissions': {
        'get': function() {
            return this._permissions ? this._permissions : this._permissions = {};
        },
        'set': function(val) {
            return this._permissions = val;
        }
    },
    'can': {
        'value': function(perm) {
            return _.isBoolean(this.permissions[perm]) ? this.permissions[perm] : true;
        }
    }
};
