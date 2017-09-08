# sftp-server

---

A Node.js-based SFTP server with an integrated REST API for querying users / files. Provides a customizable authentication strategy. Emits various events as file changes occur, allowing you to notify third-party services.

*This is a work in progress.*


## Example

```
const fs = require('fs');
const Promise = require('bluebird');
const SFTPServer = require('sftp-server');
const path = require('path');

const server = new SFTPServer({
    'port': 3333,
    'api_port': 8000,
    'api_key': 'yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM',
    'hostKeys': [
        fs.readFileSync(__dirname + '/host_rsa')
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
});

server.on('listening', (data) => {
    console.log('listening', data);
});

server.on('login', (data) => {
    console.log('login', data);
});

server.on('upload_complete', (data) => {
    console.log('upload_complete', data);
});

server.listen();
```

## ToDo

- Additional tests
- Optional file-based event log (e.g. Winston)
- Additional work on REST API
- Improved support for various SFTP commands (FSTAT, etc...)

## Related Resources

- [ssh2](https://github.com/mscdex/ssh2)

## Tests

```
$ npm run test
```
