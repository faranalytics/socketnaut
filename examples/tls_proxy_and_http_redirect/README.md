# *A TLS Proxy and an HTTP Redirect.*

In this example you will create an HTTP Service that redirects to a Service that consists of a TLS proxy that manages a pool of HTTP servers.

The proxy is a TLS server.

`index.ts`
```ts

...

const tlsServer = tls.createServer({
    key: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/key.pem')),
    cert: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/crt.pem'))
}); // Configure this TLS Server however you choose.

tlsServer.listen({ port: 3443, host: '0.0.0.0' });

// Create a Service Proxy for handling HTTP requests.
const tlsProxy = createServiceProxy({
    server: tlsServer,
    minWorkers: 4,
    maxWorkers: 42,
    workerURL: new URL('./service.js', import.meta.url)
});

...
```

The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request, logs the proxy socket tuple, and echoes the message body.

`service.ts`
```js
import * as http from 'node:http';
import { createServiceAgent } from 'socketnaut';

const server = http.createServer(); // Configure this HTTP Server however you choose.

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });

server.on('request', async (req: http.IncomingMessage, res: http.ServerResponse) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    const proxyAddressInfo = await agent.requestProxySocketAddressInfo(req.socket);
    console.log(proxyAddressInfo);
    req.pipe(res);
});
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
cd socketnaut/examples/tls_proxy_and_http_redirect
```
### Install the example dependencies.
```bash
npm install && npm update
```
### Edit index.ts in order to read your `key` and `cert` files.
```js
const tlsServer = tls.createServer({
    key: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/key.pem')),
    cert: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/crt.pem'))
});
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
### In another shell send 1000 requests to the endpoint.
```bash
time for fun in {1..1000}; do echo "http://0.0.0.0:3080"; done | xargs -n1 -P1000 curl -k -L 
```
#### Output
```bash
real    0m11.520s
user    0m15.058s
sys     0m8.064s
```