# *Use Socketnaut to scale the main module of a Fastify server.*

In this example you will use Socketnaut to scale the main thread of a Fastify server.  The `ServiceProxy` is configured to start up 4 `http_server.js` Workers and scale up to 42 Workers on demand.

The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request.

```js
const serverFactory = (handler, opts) => {
    const service = createServiceAgent({
        server: http.createServer(opts, handler)
    });

    service.logHandler.setLevel(Level.DEBUG)

    return service.server;
};

const fastify = Fastify({ serverFactory });

fastify.get('/', (req, reply) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    void reply.send({ hello: 'world' });
});

void fastify.listen({ port: 0, host: '127.0.0.1' }); 
// Specifying port 0 here will instruct the Server to listen on a random port.  Socketnaut will communicate the randomly selected port to the ServiceProxy.
```

## Requirements
Please make sure your firewall is configured to allow connections on `0.0.0.0:3000` for this example to work.

## Instructions

### Clone the Socketnaut repo.
```bash
git clone https://github.com/faranalytics/socketnaut.git
```
### Change directory into the relevant example directory.
```bash
cd socketnaut/examples/socketnaut_fastify
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
time for i in {1..1000}; do echo "http://0.0.0.0:3000"; done | xargs -n1 -P1000 curl
```