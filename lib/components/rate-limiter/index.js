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
            log.info(`Rate-limiting IP`, { 'ip': ip });
            this.limits[ip] = (new Date).getTime();
        }

        refreshLimits() {
            const now = (new Date).getTime();
            for (let ip in this.limits) {
                const diff = (now - this.limits[ip]) / 1000;
                if (diff >= ttl) {
                    log.info(`Releasing IP from rate limit`, { 'ip': ip });
                    delete this.limits[ip];
                }
            }
        }

        isLimited(ip) {
            if (!this.limits[ip]) {
                return false;
            }
            const diff = ((new Date).getTime()) - this.limits[ip];
            if (diff < (ttl * 1000)) {
                return true;
            } else {
                delete this.limits[ip];
                return false;
            }
        }

    }

    return new RaterLimiter();

};

exports['@singleton'] = true;
exports['@require'] = ['config', 'log'];
