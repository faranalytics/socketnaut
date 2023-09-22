# *Redirect HTTP connections to an HTTPS server.*

In this example you will create an HTTP Service and a HTTPS Service.  The HTTP server will redirect all requests to the HTTPS server.

The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request and returns the string "Hello World!".

`https_server.ts`
```js
import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'fs';
import * as os from 'os';
import * as pth from 'path';
import { createServiceAgent } from 'socketnaut';

const server = https.createServer(
    {
        key: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/key.pem')),
        cert: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/crt.pem'))
    }); // Configure this HTTPS server however you choose.

server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    res.end('Hello World!');
});

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });
```
## Requirements
Please make sure your firewall is configured to allow connections on `0.0.0.0:3080` and `0.0.0.0:3443` for this example to work.

## Instructions

### Clone the Socketnaut repo.
```bash
git clone https://github.com/faranalytics/socketnaut.git
```
### Change directory into the relevant example directory.
```bash
cd socketnaut/examples/redirect_http_to_https
```
### Install the example dependencies.
```bash
npm install
```
### Edit https_server.ts in order to read your `key` and `cert` files.
```js
const server = https.createServer(
    {
        key: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/key.pem')),
        cert: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/crt.pem'))
    }); // Configure this HTTPS server however you choose.
```
### Build the TypeScript application.
```bash
npm run build
```
### Run the application.
```bash
npm start
```
### Test the HTTP redirect using your browser.
```bash
http://example.com:3080
```