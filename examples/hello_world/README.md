# _An Instance of Hello, World!_

## Introduction

In this example you will use Socketnaut to scale a Hello, World! server. The `ServiceProxy` is configured to start up 42 `http_server.js` workers.

## Implement the example

### Implement the `index.js` module

This is the main thread.

#### Import the depedencies and implement the Service Proxy.

```js
import * as net from "node:net";
import { createServiceProxy, Level } from "socketnaut";

const server = net.createServer(); // Configure this TCP Server however you choose.

server.listen({ port: 3080, host: "0.0.0.0" });

const proxy = createServiceProxy({
  server,
  workerCount: 42,
  workerURL: "./http_server.js",
});
```

### Implement the `http_server.js` module

This is your scaled application. The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request.

#### Import the dependencies, implement the application, and create a Service Agent.

```js
import * as http from "node:http";
import { createServiceAgent } from "socketnaut";

const server = http.createServer(); // Configure this HTTP Server however you choose.

server.on("request", (req, res) => {
  for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
  res.end("Hello, World!");
});

server.listen({ port: 0, host: "127.0.0.1" });
// Specifying port 0 here will cause the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });
```

## Run the example

### Requirements

- The `net.Server` will attempt to bind to `localhost:3080`.

### How to run the example

#### Clone the Socketnaut repository.

```bash
git clone https://github.com/faranalytics/socketnaut.git
```

#### Change directory into the relevant example directory.

```bash
cd socketnaut/examples/hello_world
```

#### Install the example dependencies.

```bash
npm install && npm update
```

#### Run the application.

```bash
npm start
```

#### Test the Service from the command line.

In another shell send 1000 requests to the endpoint.

```bash
time for fun in {1..1000}; do echo "http://0.0.0.0:3080"; done | xargs -n1 -P1000 curl
```

##### Output

One thousand concurrent requests were processed; each request blocked for 100ms. Please see the `http_server.js` module for detail.

```bash
real    0m12.274s
user    0m6.628s
sys     0m5.446s
```
