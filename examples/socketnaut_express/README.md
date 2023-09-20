# *Use Socketnaut to scale the main module of an Express server.*

In this example you will use Socketnaut to scale the main module of an Express server.  The `ServiceProxy` is configured to start up 4 `http_server.js` Workers and scale up to 42 Workers on demand.

The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request.

`http_server.js`
```js
const app = express();

app.get('/', (req, res) => {
  for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
  res.send('Hello World!');
});

const server = http.createServer(app);

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will instruct the Server to listen on a random port.  
// Socketnaut will communicate the randomly selected port to the ServiceProxy.

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
real    0m10.466s
user    0m6.364s
sys     0m7.143s
```