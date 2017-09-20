'use strict';

const Promise = require('bluebird');

exports = module.exports = function(config, log) {

    const ttl = parseInt(config.get('sftp:rateLimitTTL'), 10);

    class RaterLimiter {

        constructor() {

            if (!ttl) {
                return;
            }

            setInterval(() => {
                this.refreshLimits();
            }, ttl * 1000);

        }

        get limits() {
            return this._limits ? this._limits : this._limits = {};
        }

        limit(ip) {
            if (!ttl) {
                return;
            }
            if (!ip) {
                throw new Error(`'ip' is required`);
            }
            this.limits[ip] = (new Date).getTime();
            console.log(this.limits);
        }

        refreshLimits() {
            const now = (new Date).getTime();
            for (let ip in this.limits) {
                const diff = (now - this.limits[ip]) / 1000;
                console.log(diff);
                if (diff >= ttl) {
                    delete this.limits[ip];
                }
            }
        }

        isLimited(ip) {
            return this.limits[ip] ? true : false;
        }

    }

    return new RaterLimiter();

};

exports['@singleton'] = true;
exports['@require'] = ['config', 'log'];
