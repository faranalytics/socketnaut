# *An instance of Hello World!*

In this example you will use Socketnaut to scale a Hello World! server.  The `ServiceProxy` is configured to start up 4 `http_server.js` workers and scale up to 42 workers on demand.

The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request.

```js
import * as http from 'node:http';
import { createServiceAgent } from 'socketnaut';

const server = http.createServer() // Configure this HTTP Server however you choose.

server.on('request', (req, res) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    res.end('Hello World!');
});

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
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
cd socketnaut/examples/hello_world
```
### Install the example dependencies.
```bash
npm install
```
### Run the application.
```bash
npm start
```
### In another shell send 1000 requests to the endpoint.
```bash
time for fun in {1..1000}; do echo "http://0.0.0.0:3080"; done | xargs -n1 -P1000 curl
```
#### Output
```bash
real    0m12.274s
user    0m6.628s
sys     0m5.446s
```