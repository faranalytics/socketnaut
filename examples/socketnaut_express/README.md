# *Use Socketnaut to scale the main module of an Express web application.*

In this example you will use Socketnaut to scale the main module of an Express web application.  This example consists of an `index.js` module and a scaled `http_server.js` module.  In `index.js` a `ServiceProxy` is instantiated and configured to start up 4 `http_server.js` workers and scale up to 42 workers on demand.

`index.js`

This is the main thread.
```js
import * as net from 'node:net';
import { createServiceProxy, Level } from 'socketnaut';

const server = net.createServer(); // Configure this TCP Server however you choose.

server.listen({ port: 3080, host: '0.0.0.0' });

const proxy = createServiceProxy({
    server,
    minWorkers: 4,
    maxWorkers: 42,
    workerURL: './http_server.js'
});
```

`http_server.js`

This is your scaled application. The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request.
```js
import * as http from 'node:http';
import express from 'express';
import { createServiceAgent } from 'socketnaut';

const app = express();

app.get('/', (req, res) => {
  for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
  res.send('Hello World!');
});

const server = http.createServer(app); // Configure this HTTP Server however you choose.

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will instruct the Server to listen on a random port.  
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });
```
## Requirements
Please make sure your firewall is configured to allow connections on `0.0.0.0:3080` for this example to work.

## Instructions

### Clone the Socketnaut repo.
```bash
git clone https://github.com/faranalytics/socketnaut.git
```
### Change directory into the relevant example directory.
```bash
cd socketnaut/examples/socketnaut_express
```
### Install the example dependencies.
```bash
npm install && npm update
```
### Run the application.
Run the `index.js` module.
```bash
npm start
```
### In another shell send 1000 requests to the endpoint.
```bash
time for fun in {1..1000}; do echo "http://0.0.0.0:3080"; done | xargs -n1 -P1000 curl
```
#### Output
```bash
real    0m10.466s
user    0m6.364s
sys     0m7.143s
```