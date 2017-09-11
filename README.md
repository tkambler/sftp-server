# sftp-server

---

A Node.js-based SFTP server with an integrated REST API for querying users / files. Provides a customizable authentication strategy. Emits various events as file changes occur, allowing you to notify third-party services.

Useful when you need to provide clients with a standardized interface for submitting files, data feeds, etc... to you.

PR's are welcome.


## Example

```
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');

const server = require('sftp-server')({
    'sftp': {
        'port': 3333,
        'hostKeys': [
            fs.readFileSync(__dirname + '/host_rsa').toString('utf8')
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
            'enabled': true
        },
        'file': {
            'enabled': true,
            'filename': '/var/log/sftp-server.log'
        }
    }
})
    .then((server) => {

        server.on('listening', (data) => {
            // ...
        });

        server.on('login', (data) => {
            // ...
        });

        server.on('upload_complete', (data) => {
            // ...
        });

        server.on('ready', () => {
            // ...
        });

        server.listen();

    });

```

## REST API

### Health Check

    $ curl -X GET http://127.0.0.1:8000/api/ping

### Fetch Users

    $ curl -X GET --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" http://127.0.0.1:8000/api/users

## Docker

```
$ docker build -t sftp-server:latest .
$ docker run --rm -v $(pwd)/example/server.js:/opt/sftp-server/example/server.js sftp-server:latest
```

## To-Do

- Additional tests
- Additional logging
- Additional work on REST API
- Improved support for various SFTP commands (FSTAT, etc...)
- Support for user-specific permissions (can the user upload files / create directories / etc...?)
- Docker image

## Development

### Launching the Example Server

Install dependencies then launch the included example instance ([./example/server.js](./example/server.js)) via [Nodemon](https://nodemon.io/):

```
$ npm i
$ npm run dev
```

### Tests

```
$ npm run test
```

## Related Resources

- [ssh2](https://github.com/mscdex/ssh2)

## Tests

```
$ npm run test
```
