# sftp-server

---

A Node.js-based SFTP server with an integrated REST API for querying users / files. Provides a customizable authentication strategy. Emits various events as file changes occur, allowing you to notify third-party services. Useful when you need to provide clients with a standardized interface for submitting files, data feeds, etc... to you.

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
    
        server.on('ready', () => {
            // ...
        });

        server.on('login', (data) => {
            // ...
        });

        server.on('upload_complete', (data) => {
            // ...
        });
        
        server.on('remove', (data) => {
            // ...
        });
        
        server.on('mkdir', (data) => {
            // ...
        });
        
        server.on('rmdir', (data) => {
            // ...
        });
        
        server.on('rename', (data) => {
            // ...
        });

        server.listen();

    });

```

## Authentication

SFTPServer has no built-in mechanism for managing users. The expectation is that the service is implemented in conjunction with a separate, pre-existing service that manages this information.

Authentication is implemented by including a callback function (`sftp.auth`) within the options that are passed when creating a new instance of SFTPServer (see previous example). When a user attempts to sign in, this function will be passed the username and password provided by the client. A promise should be returned.  A rejected promise indicates a sign-in failure, while a resolution indicates success.

Optionally, you may choose to resolve the returned promise with an object describing the various SFTP commands that the connecting client should be allowed to perform. By default, _all_ commands are enabled. Select commands can be individually disabled as shown below.

```
{
    'auth': function(username, password) {
        return Promise.resolve()
            .then(() => {
                if (username !== 'foo' || password !== 'bar') {
                    throw new Error();
                }
                return {
                	'permissions': {
						'MKDIR': false
                	}
                };
            });
    }
}
```

Commands which can be selectively disabled include:

- MKDIR
- READ
- REMOVE
- RENAME
- RMDIR
- WRITE

## REST API

### Health Check

    $ curl -X GET http://127.0.0.1:8000/api/ping

### Fetch Users

    $ curl -X GET --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" \
    	http://127.0.0.1:8000/api/users

### Fetch and Manipulate Files / Folders

The URLs for all API calls related to file / folder interactions are structured in the following manner:

http://[hostname]:[port]/api/users/[username]/files/[path-to-file]

#### Fetching a list of files at the root level of a user's folder


    $ curl -X GET --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" \
    	http://127.0.0.1:8000/api/users/foo/files

```
[
    {
        "file": ".viminfo",
        "stats": {
            "dev": 16777224,
            "mode": 33188,
            "nlink": 1,
            "uid": 501,
            "gid": 20,
            "rdev": 0,
            "blksize": 4096,
            "ino": 117661849,
            "size": 9171,
            "blocks": 24,
            "atime": "2017-09-11T13:58:58.000Z",
            "mtime": "2017-09-11T00:42:45.000Z",
            "ctime": "2017-09-11T00:42:45.000Z",
            "birthtime": "2017-09-11T00:42:45.000Z",
            "isFile": true,
            "isDirectory": false
        }
    },
    {
        "file": "herp",
        "stats": {
            "dev": 16777224,
            "mode": 16877,
            "nlink": 3,
            "uid": 501,
            "gid": 20,
            "rdev": 0,
            "blksize": 4096,
            "ino": 117690342,
            "size": 102,
            "blocks": 0,
            "atime": "2017-09-11T14:00:44.000Z",
            "mtime": "2017-09-11T13:59:05.000Z",
            "ctime": "2017-09-11T13:59:05.000Z",
            "birthtime": "2017-09-11T13:58:58.000Z",
            "isFile": false,
            "isDirectory": true
        }
    }
]
```

#### Addressing Specific Files / Sub-Directories

Specific files / sub-directories can be addressed by appending the desired path to the URL we saw in the previous example.

	# Fetch files within the 'herp' subdirectory of the specified user's (foo) folder:
    $ curl -X GET --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" \
    	http://127.0.0.1:8000/api/users/foo/files/herp

	# Delete the 'herp' subdirectory of the specified user's (foo) folder:
    $ curl -X DELETE --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" \
    	http://127.0.0.1:8000/api/users/foo/files/herp

	# Fetch a specific file:
    $ curl -X GET --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" \
    	http://127.0.0.1:8000/api/users/foo/files/herp/derp.txt

	# Delete a specific file:
    $ curl -X DELETE --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" \
    	http://127.0.0.1:8000/api/users/foo/files/herp/derp.txt

#### Fetching User Meta Information

To fetch meta information for a file or folder, append `?meta=true` to the appropriate GET call. For example - to fetch meta information regarding a user's root folder, you would make the following call:

```
$ curl -X GET --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" \
	http://127.0.0.1:8000/api/users/foo/files?meta=true
```

Returns:

```
{
    "dev": 16777224,
    "mode": 16877,
    "nlink": 6,
    "uid": 501,
    "gid": 20,
    "rdev": 0,
    "blksize": 4096,
    "ino": 117649567,
    "size": 204,
    "blocks": 0,
    "atime": "2017-09-11T14:40:17.000Z",
    "mtime": "2017-09-11T13:58:58.000Z",
    "ctime": "2017-09-11T13:58:58.000Z",
    "birthtime": "2017-09-10T20:02:42.000Z",
    "isFile": false,
    "isDirectory": true,
    "totalSize": 10017653
}
```

The `totalSize` property indicates the total combined size of all files / directories contained within the specified directory. When metadata is fetched for a specific file, this attribute will not be present.

#### Fetching System Meta Information

```
$ curl -X GET --header "x-token: yYNR8xeUGtcim7XYaUTsdfmkNuKxLHjw77MbPMkZzKoNdsAzyMryVLJEzjVMHpHM" \
	http://127.0.0.1:8000/api/system/meta
```

Returns:

```
{
    "totalUsers": 1,
    "totalStorage": 10023937
}
```

## To-Do

- Additional tests
- Additional logging
- Additional work on REST API
- Improved support for various SFTP commands (FSTAT, etc...)
- Fix sub-directory upload bug (when uploading a file to a sub-directory the client has created, the file is always uploaded to the root folder)

## Development

### Launching the Example Server

Install dependencies then launch the included example instance ([./example/server.js](./example/server.js)) via [Nodemon](https://nodemon.io/):

```
$ npm i
$ npm run dev
```

## Production Environments

Disable debug messages in production by ensuring the `NODE_ENV` environmental variable is set to `production`.

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
