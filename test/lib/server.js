'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const SFTPServer = require('../../');
const path = require('path');

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAuO64p27mytakPTOjZ0ZrvGySo424avpOt1OhmBInrIO3fY6J
a9gd6g0KiSdnPnPxFBewY82wsHFnsMghWS3+vpehiE59ZiQUSttCNVT6o/8MBHi0
lq11DLni+XCOXJrNoN3xE96wAHRxL9ukVnDw0GtO69GCFH72IgFq8W8ncsYqXQeG
Ayy9Fn5JFo2YXjX+YQfSQgmfxyiTwnZOTzxTYucnmvUkLwc8QRgfVvPmCuV/kJo8
HrZM/rCR43zfRmpLORl4NSSxm19sNxMC+axS3cQx/h7vWlE5qlbzPyEmvAxJZkIm
Iv2G+AoaIx5bazSGkQijuZSXW1MnQJ0wgT2EnQIDAQABAoIBAQC37BvT0ZVRaHWB
tMivnrbpd+XDKeCe7IC7DT7qeivhBELKaac8jXz62KuAyqKA11iNjh3MtLYkVTU1
+WRJSFhR/4YUhVNr8TgJVtUbK3/2+GJgVBfuv2ZpGLqnMA02BnO5qOHpzBCo8yXa
3gwsODkYX5DnMb+4WKi8G0LcCZtnJgP6xXIqHMsGTjIovT0zsbKb3ZQuJU1/ArpL
EXABotVctXBnx2YZtmKZZrF+9X5XT4YOhE6vGDUzhFr/LDX3x8rl1AIo0kfHGl3w
bzfCc499qivldo04FLVjhEloKC08z8DIvYsmY5r+xmY7rgMI9me+ElskKtYPfdpt
Y/Ufip81AoGBAN4Smgh4Tj/zSvGoifvhv/aceP/o+X2JJv8aA8/tJkoZONtwh60r
pMU5vArQOJfeh2rDtRwW5/WQ5zr+/yigg0AIOxgRifuM+BJnw4CA7uTeie/k02Ij
xnhRjCHMv2/hwjWtdkOzbQKDVjcxyhsS6FOCoZzR2sBVV2jtTAMo8b8bAoGBANUv
i5OQBLZN0o7/kjJikQUaRyxi5l5bhoW+2wMQCccx+G5u/0h7YlKEqIU6PqcKffnp
W3PXR8d7UqjgSqZMHBBzlYGIV8EVZfXUFQGxfD4mRw1hJEvJrAE+rLiNOI8Q0SB1
EBmsqfeP11ZfOECVqFPTn/YWwHEAYgUIrbTdyS6nAoGAN40brwa5PFIV60Gn0rR0
GrKlqg6Tao3GjYXqcjb2nw6UJICP0Afc3eFFYscXgRYPdeujAHXSbKFk1mM3XOha
LMhiT/EDPUPUQnZmd1zJZcMtai8pmaEtYqezkDjxooEs3dSYgvL9T+WeyYvQ7Njb
+RfyaZItUHOIvBywKRIy9wUCgYBn+qmsTnlN5cVGQ/ctpg+vmnKOfqp36VJCl6VA
6CisxH20d2UCGFQLhXKgkJkQZjitlRkq9hynekoF3mfqloK1r3qDVFng7ivt7ARW
8Bd2RLsxFmlaocHIVaZu2Up11TD7EL3KmAHKopjYItdQAO65/CUwJUa1lwc4B1Sa
O/atTwKBgFeM4T0zln4rdpV+Z0whHCsVH7cciyADcW8SaTC/Bsd+7VjdTHWI7oNf
gjbj2tDc65zTSnw9fHbz9gUkANNs+v8AvY8OIJ8CBqTcPusvqsdkxfYl4IHwGxjP
9f1/0rFNoJsa66vNU85QH1Qhw+CT8SE2+H/WLxOPnVKvtodNrwYp
-----END RSA PRIVATE KEY-----`;

const server = require('../../')({
    'sftp': {
        'port': 4000,
        'hostKeys': [
            privateKey
        ],
        'dataDirectory': path.resolve(__dirname, '../data'),
        'auth': function(username, password) {
            return Promise.resolve()
                .then(() => {
                    if (username !== 'foo' || password !== 'bar') {
                        throw new Error();
                    }
                });
        }
    },
    'api': {
        'port': 8000,
        'key': 'yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM'
    },
    'log': {
        'console': {
            'enabled': false
        },
        'file': {
            'enabled': false
        }
    }
})

module.exports = server;
