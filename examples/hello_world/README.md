# *An instance of Hello World!* <sup><sup>(example)</sup></sup>

In this example you will use Socketnaut to scale a Hello World! server.  The `ServiceProxy` is configured to start up 42 `http_server.js` Workers and scale up to 100 Workers as demand requires.

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
cd examples/hello_world
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