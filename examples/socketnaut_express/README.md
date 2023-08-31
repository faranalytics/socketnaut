# *Use Socketnaut to scale the main thread of an Express server.* <sup><sup>(example)</sup></sup>

In this example you will use Socketnaut to scale the main thread of an Express server.  The `ServiceProxy` is configured to start up 4 `http_server.js` Workers and scale up to 42 Workers on demand.

The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request.

```js
for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
```
## Requirements
Please make sure your firewall is configured to allow connections on `0.0.0.0:3000` for this example to work.

## Instructions

### Clone the Socketnaut repo.
```bash
git clone https://github.com/faranalytics/socketnaut.git
```
### Install Socketnaut dependencies.
```bash
cd socketnaut
npm install
```
### Change directory into the relevant example directory.
```bash
cd examples/socketnaut_express
```
### Install the example dependencies.
```bash
npm install
```
### Run the application.
```bash
npm start
```
### Send 1000 requests to the endpoint.
```bash
time seq 1000 | xargs -I{} echo "http://0.0.0.0:3000" | xargs -n1 -P1000 curl
```