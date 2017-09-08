# sftp-server

---

## Example

```
const fs = require('fs');
const Promise = require('bluebird');
const SFTPServer = require('sftp-server');
const path = require('path');

const server = new SFTPServer({
    'port': 3333,
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
- Optional file-based event log
- Additional work to REST API
- Improved support for various SFTP commands (FSTAT, etc...)

## Tests

```
$ npm run test
```
