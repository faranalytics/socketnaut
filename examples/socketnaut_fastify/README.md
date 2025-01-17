# _Use Socketnaut to Scale a Fastify Web Application_

## Introduction

In this example you will use Socketnaut to scale the main module of a Fastify web application. The `ServiceProxy` is configured to start up 4 `http_server.js` workers and scale up to 42 workers on demand.

## Implementation

`index.js`

This is the main thread.

```js
import * as net from "node:net";
import { createServiceProxy, Level } from "socketnaut";

const server = net.createServer(); // Configure this TCP Server however you choose.

server.listen({ port: 3080, host: "0.0.0.0" });

const proxy = createServiceProxy({
  server,
  minWorkers: 4,
  maxWorkers: 42,
  workerURL: "./http_server.js",
});
```

`http_server.js`

This is your scaled application. The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request.

```js
import Fastify from "fastify";
import { createServiceAgent } from "socketnaut";

const fastify = Fastify();

const agent = createServiceAgent({ server: fastify.server });

fastify.get("/", (req, reply) => {
  for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
  void reply.send({ hello: "world" });
});

void fastify.listen({ port: 0, host: "127.0.0.1" });
// Specifying port 0 here will instruct the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.
```

## Run the Example

### Requirements

Please make sure your firewall is configured to allow connections on `0.0.0.0:3080` for this example to work.

### Instructions

#### Clone the repository and run the example.

Clone the Socketnaut repo.

```bash
git clone https://github.com/faranalytics/socketnaut.git
```

Change directory into the relevant example directory.

```bash
cd socketnaut/examples/socketnaut_fastify
```

Install the example dependencies.

```bash
npm install && npm update
```

Run the application. The `start` script will run the `index.js` module.

```bash
npm start
```

#### Test the Service from the command line.

In another shell send 1000 requests to the endpoint.

```bash
time for fun in {1..1000}; do echo "http://0.0.0.0:3080"; done | xargs -n1 -P1000 curl
```

#### Output

One thousand concurrent requests were processed; each request blocked for 100ms. Please see the `http_server.js` module for detail.

```bash
real    0m10.947s
user    0m6.572s
sys     0m7.151s
```
