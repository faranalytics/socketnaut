# _An Instance of Hello, World! Using the TypeScript Execute Loader_

## Introduction

In this example you will use Socketnaut to scale a Hello, World! server. The `ServiceProxy` is configured to start up 42 `http_server.js` workers.

The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request.

## Implementation

`index.ts`

This is the main thread.

```js
import * as net from "node:net";
import { createServiceProxy, Level } from "socketnaut";

const server: net.Server = net.createServer(); // Configure this TCP Server however you choose.

server.listen({ port: 3080, host: "0.0.0.0" });

const proxy = createServiceProxy({
  server,
  workerCount: 42,
  workerURL: `import { tsImport } from "tsx/esm/api"; tsImport("./http_server.ts", import.meta.url);`,
  workerOptions: { eval: true },
});

proxy.log.setLevel(Level.DEBUG);
```

`http_server.ts`

This is your scaled application. The endpoint i.e., /, runs a for loop that blocks for 100ms on each request.

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
cd socketnaut/examples/hello_world_tsx
```

Install the example dependencies.

```bash
npm install && npm update
```

Run the application.

```bash
npm start
```

#### Test the HTTP redirect from the command line.

In another shell send 1000 requests to the endpoint.

```bash
time for fun in {1..1000}; do echo "http://0.0.0.0:3080"; done | xargs -n1 -P1000 curl
```

#### Output

One thousand concurrent requests were processed; each request blocked for 100ms. Please see the `http_server.ts` module for detail.

```bash
real    0m12.274s
user    0m6.628s
sys     0m5.446s
```
