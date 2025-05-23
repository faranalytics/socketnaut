# **Socketnaut**

Scalable multithreaded Node.js servers made easy.

## Introduction

<img align="right" width="425px" src="./transport.svg">

Socketnaut makes scaling native Node.js servers easy. A Socketnaut [Service](https://github.com/faranalytics/socketnaut?#concepts) typically consists of a TCP proxy and a pool of HTTP servers. Socketnaut will uniformly distribute incoming TCP sockets across the pool of allocated servers. This strategy allows for both distribution and parallel processing of incoming requests. Socketnaut consumes native Node.js servers (e.g., `http.Server`, `https.Server`, `net.Server`, `tls.Server`); hence, if you know the [Node API](https://nodejs.org/docs/latest-v18.x/api/http.html), you already know how to build applications on Socketnaut!

Socketnaut can be used in order to scale the **main module** of web applications built on performant Node.js web frameworks (e.g., [Fastify](https://fastify.dev/), [Koa](https://koajs.com/), [Express](https://expressjs.com/)). Please see the [Examples](#examples) section for instructions on how to do this.

### Features

- Socketnaut requires 0 out-of-org dependencies. Socketnaut's dependencies are published and maintained by the FAR Analytics & Research org:
  - [_Streams_ Logger](https://www.npmjs.com/package/streams-logger); a performant logger built from Node.js streams.
  - [Port Agent](https://www.npmjs.com/package/port_agent); an RPC-like facility for making inter-thread function calls.
- The Socketnaut `ServiceProxy` and `ServiceAgent` constructors consume native Node [`net.Server`](https://nodejs.org/api/net.html#class-netserver), [`http.Server`](https://nodejs.org/api/http.html#class-httpserver), [`https.Server`](https://nodejs.org/api/https.html#class-httpsserver), and [`tls.Server`](https://nodejs.org/api/tls.html#class-tlsserver) instances; _you can configure them however you choose_.
- Import Socketnaut as a Node.js module (see the [Hello, World!](#an-instance-of-hello-world-nodejs) example) or take advantage of the packaged type definitions and import it into your TypeScript project.

## Table of contents

- [Installation](#installation)
- [Concepts](#concepts)
- [Usage](#usage)
- [Examples](#examples)
- [API](#api)
- [Tuning strategies](#tuning-strategies)
- [Client-Proxy socket remote address and port](#client-proxy-socket-remote-address-and-port)
- [Logging](#logging)
- [Versioning](#versioning)
- [Test](#test)
- [Support](#support)

## Installation

```bash
npm install socketnaut
```

## Concepts

A Socketnaut **Service** consists of a `ServiceProxy` and a `ServiceAgent`.

### Service Proxy

A `ServiceProxy` is used in order to bind a TCP server to a specified port (usu. a public interface). A `ServiceProxy` can be instantiated using the `createServiceProxy` function. The `ServiceProxy` uniformly distributes TCP connections to servers (e.g., HTTP servers) in the worker thread pool. The `ServiceProxy` manages the thread pool according to the values specified for the `minWorkers` and `maxWorkers` parameters or `workerCount` parameter.

### Service Agent

A `ServiceAgent` coordinates the state of its server (e.g., the server's address) with its respective proxy. A `ServiceAgent` can be instantiated using the `createServiceAgent` function. It consumes a native Node.js server (e.g., [`net.Server`](https://nodejs.org/api/net.html#class-netserver), [`http.Server`](https://nodejs.org/api/http.html#class-httpserver), [`https.Server`](https://nodejs.org/api/https.html#class-httpsserver), [`tls.Server`](https://nodejs.org/api/tls.html#class-tlsserver)). The Node.js server provided to the `ServiceAgent` may be used the same way it is used natively; hence, Socketnaut works with many popular Node.js web frameworks. Please see the [Examples](#examples) section for instructions on how to use Socketnaut with native Node.js servers and web application frameworks.

## Usage

This simple "Hello, World!" app is a complete Socketnaut Service. **You're looking at an ordinary Node.js web app**, except that a `ServiceProxy` instance is created in the `index.js` module and a `ServiceAgent` instance is created in the scaled `http_server.js` module - _that is all it takes to scale this web app_. Scaling sophisticated web applications is just as easy.

Please see the [Hello, World! example](https://github.com/faranalytics/socketnaut/tree/main/examples/hello_world) for a working implementation.

### Implement the index.js module

#### Import the dependencies and create a Service Proxy.

This is the main thread.

```js
import * as net from "node:net";
import { createServiceProxy } from "socketnaut";

const server = net.createServer(); // Configure this TCP server however you choose.

server.listen({ port: 3080, host: "0.0.0.0" });

const proxy = createServiceProxy({
  server,
  workerCount: 42, // Start 42 instances of the `http_server.js` module.
  workerURL: "./http_server.js", // The scaled module.
});
```

### Implement the http_server.js module

#### Import the dependencies, implement the application, and create a Service Agent.

This is the scaled application.

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

## Examples

### _An instance of Hello, World!_ <sup><sup>\</Node.js\></sup></sup>

Please see the [Hello, World! example](https://github.com/faranalytics/socketnaut/tree/main/examples/hello_world) for a working implementation.

### _Use Socketnaut to scale a Fastify web application_ <sup><sup>\</TypeScript\></sup></sup>

Please see the [Fastify example](https://github.com/faranalytics/socketnaut/tree/main/examples/socketnaut_fastify) for a working implementation.

### _Use Socketnaut to scale a Koa web application_ <sup><sup>\</TypeScript\></sup></sup>

Please see the [Koa example](https://github.com/faranalytics/socketnaut/tree/main/examples/socketnaut_koa) for a working implementation.

### _Use Socketnaut to scale an Express web application_ <sup><sup>\</TypeScript\></sup></sup>

Please see the [Express example](https://github.com/faranalytics/socketnaut/tree/main/examples/socketnaut_express) for a working implementation.

### _Redirect HTTP connections to an HTTPS server_ <sup><sup>\</TypeScript\></sup></sup>

Please see the [Redirect HTTP to HTTPS example](https://github.com/faranalytics/socketnaut/tree/main/examples/redirect_http_to_https) for a working implementation.

### _A TLS proxy and an HTTP redirect_ <sup><sup>\</TypeScript\></sup></sup>

In the previous example, the TLS endpoint was in the worker thread; however, it doesn't need to be. Alternatively, TLS can be handled by the proxy server. Please see the [A TLS Proxy and an HTTP Redirect example](https://github.com/faranalytics/socketnaut/tree/main/examples/tls_proxy_and_http_redirect) for a working implementation.

## API

### The ServiceProxy class

#### socketnaut.createServiceProxy(options)

- options `<ServiceProxyOptions>`

  - `maxWorkers` `<number>` Optional argument that specifies the maximum number of worker threads permitted.

  - `minWorkers` `<number>` Optional argument that specifies the minimum number of worker threads permitted. **Default**: `0`

  - `server` `<node:net.Server>` or `<node:tls.Server>` A `net.Server` configured however you choose.

  - `workersCheckingInterval` `<number>` Optional argument that specifies the approximate interval (milliseconds) at which inactive worker threads will be cleaned up.

  - `workerOptions` `<node:worker_threads.WorkerOptions>` Optional `WorkerOptions` passed to the `worker_threads.Worker` constructor.

  - `workerCount` `<number>` Optional argument that specifies the number of worker threads to be spawned when Socketnaut starts. This setting will override `minWorkers` and `maxWorkers`.

  - `workerURL` `<string>` or `<URL>` The URL or path to the `.js` module file that contains the `ServiceAgent` instance. This is the module that will be scaled according to the values specified for `minWorkers` and `maxWorkers`. Please see the [Examples](#examples) section for how to specify the proxy's `ServiceAgent` module.

Returns: `<socketnaut.ServiceProxy>`

Creates a `ServiceProxy`. Each process may contain any number of ServiceProxys. However, all ServiceProxys run in the main thread; hence, the number of instances created in each process should be considered carefully.

Event: **'ready'** The `'ready'` event is emitted when the `ServiceProxy` has spawned its worker threads.

_public_ **serviceProxy.shutdown()**

Returns: `<Promise<Array<PromiseSettledResult<unknown>>>>`

Performs a graceful shutdown. The `Server` is closed. Event listeners are removed. Worker threads are terminated asynchronously. The process does a clean exit (_this assumes there aren't any remaining refs_). The method returns a `Promise` that will resolve to an `Array` of `PromiseSettledResult`, where each element reflects the exit status of each worker thread. It will throw an `Error` if the `Server` is closed prior to being opened.

### The ServiceAgent class

#### socketnaut.createServiceAgent(options)

- options `<ServiceAgentOptions>`

  - `server` `<node:http.Server>` or `<node:https.Server>` or `<node:net.Server>` or `<node:tls.Server>` A native Node.js `Server` configured however you choose.

Returns: `<socketnaut.ServiceAgent>`

Creates a `ServiceAgent`. Just one `ServiceAgent` may be instantiated for each worker; hence, this function will throw an `Error` if it is called more than once in a module.

_public_ **serviceAgent.requestProxySocketAddressInfo(socket)**

- `socket` `<net.Socket>` The socket associated with the `http.IncomingMessage` i.e., `http.IncomingMessage.socket`.

Returns: `<Promise<socketnaut.ProxySocketAddressInfo>>`

The method returns a `Promise` that will resolve to an object that contains information that describes the proxy's socket tuple (i.e., in most cases this will contain the client's IP address and port).

## Tuning strategies

Scaling can be tuned by specifying a minimum and maximum, or a specific number, of allocated worker threads to be spawned.

### Relevant ServiceProxy constructor parameters

#### socketnaut.createServiceProxy(options)

- options `<ServiceProxyOptions>`

  - `maxWorkers` `<number>` Optional argument that specifies the maximum number of worker threads permitted.

  - `minWorkers` `<number>` Optional argument that specifies the minimum number of worker threads permitted. **Default**: `0`

  - `workersCheckingInterval` `<number>` Optional argument that specifies the approximate interval (milliseconds) at which inactive worker threads will be cleaned up.

  - `workerCount` `<number>` Optional argument that specifies the number of worker threads to be spawned when Socketnaut starts. This setting will override `minWorkers` and `maxWorkers`.

The `minWorkers` argument specifies the minimum number of worker threads to be permitted in the thread pool. `minWorkers` worker threads will be instantiated when the Socketnaut proxy starts. Socketnaut will not allow the thread pool to drop below the specified threshold. However, if a worker thread throws an uncaught exception, Socketnaut will not attempt to automatically restart it, which could result in a thread pool below the specified threshold.

The `maxWorkers` argument is a hard limit on _online_ threads; however, because thread termination is asynchronous it is possible for the combined count of online and liminal threads to briefly exceed this limit.

The `workersCheckingInterval` argument specifies the approximate interval at which Socketnaut will attempt to clean up inactive worker threads. If Socketnaut's proxy finds that a thread has 0 connections, Socketnaut will remove it from the pool and send it a notification requesting that it exit.

The `workerCount` argument sets the number of worker threads to be spawned when Socketnaut starts. When this argument is specified the effect is for both `minWorkers` and `maxWorkers` to be set to the value of `workerCount`.

By variously specifying `minWorkers`, `maxWorkers`, and `workersCheckingInterval`, or `workerCount`, you can tune Socketnaut according to the requirements of your environment.

## Client-Proxy socket remote address and port

Socketnaut provides a facility for obtaining information about the client-proxy socket. When a proxied request is made to an `http.Server`, the `request` handler is passed a `http.IncomingMessage`. The remote address of the socket, accessed using `http.IncomingMessage.socket.remoteAddress`, will provide the remote address of the proxy (usu. 127.0.0.1) - not the remote address of the client. Implementations such as **Proxy Protocol** and the `Forwarded` HTTP header are commonly used in order to address this issue.

Socketnaut solves this problem by simply providing a `MessageChannel` facility for requesting information about the client-proxy socket. Call the `ServiceAgent.requestProxySocketAddressInfo` method with the request socket (e.g., `req.socket`) as an argument. The method returns a `Promise` that will resolve to a `socketnaut.ProxySocketAddressInfo` object that contains information that describes the proxy's socket tuple.

### Example

```ts
const server = http.createServer();

const agent = createServiceAgent({ server });

server.on(
  "request",
  async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const proxySocketAddressInfo = await agent.requestProxySocketAddressInfo(
      req.socket
    );
    console.log(proxySocketAddressInfo);
    /* Output
    {
        local: { address: '192.0.2.1', family: 'IPv4', port: 3443 },
        remote: { address: '198.51.100.1', family: 'IPv4', port: 35798 }
    }
    */
    res.end();
  }
);
```

The information returned by the `ServiceAgent.requestProxySocketAddressInfo` method can be used in order to associate the remote client address and port with each HTTP request e.g., for logging purposes.

## Logging

By default Socketnaut logs to the console using the performant [_Streams_ Logger](https://github.com/faranalytics/streams-logger).

### Changing the log level

You can set the log level on the `Logger` itself to a syslog logging level using the `log.setLevel` method. The default log `Level` is `INFO`.

#### Set the Service Proxy's log level to DEBUG.

`index.js`

```js
import { Level } from 'socketnaut';
...
proxy.log.setLevel(Level.DEBUG);
```

#### Set the Service Agent's log level to DEBUG.

`http_server.js`

```js
import { Level } from 'socketnaut';
...
agent.log.setLevel(Level.DEBUG);
```

### Log to a file using a rotating file handler

Socketnaut's `Logger` may be configured however you choose. You can `connect` or `disconnect` _Streams_ logging Nodes from the logging graph. You can reference the Nodes by importing them from Socketnaut's index. In this example Socketnaut's `Logger`, `Formatter`, and `ConsoleHandler` are imported.

```ts
import { logger, formatter, consoleHandler } from "socketnaut";
```

Once you have imported Socketnaut's logging Nodes, you can manipulate the logging graph as you choose using the [_Streams_ Logger API](https://github.com/faranalytics/streams-logger#api). You could, for example, configure the Service Proxy to log to a file instead of the console.

In this example a `RotatingFileHandler` is instantiated that will log messages to a file named `socketnaut.log`. Socketnaut's `Formatter` is disconnected from the `ConsoleHandler` and connected to the `RotatingFileHandler`.

```ts
import { formatter, consoleHandler, Level } from "socketnaut";
import { RotatingFileHandler } from "streams-logger";

const rotatingFileHandler = new RotatingFileHandler({
  path: "./socketnaut.log",
  level: Level.DEBUG,
});

formatter.disconnect(consoleHandler).connect(rotatingFileHandler);
```

You can use Socketnaut's `logger` instance for your logging purposes or use a logger of your choice. Please see the detailed [_Streams_ Logger](https://github.com/faranalytics/streams-logger) documentation for further instructions on how to configure a _Streams_ logging graph.

## Versioning

The Socketnaut package adheres to semantic versioning. Breaking changes to the public API will result in a turn of the major. Minor and patch changes will always be backward compatible.

Excerpted from [Semantic Versioning 2.0.0](https://semver.org/):

> Given a version number MAJOR.MINOR.PATCH, increment the:
>
> 1. MAJOR version when you make incompatible API changes
> 2. MINOR version when you add functionality in a backward compatible manner
> 3. PATCH version when you make backward compatible bug fixes
>
> Additional labels for pre-release and build metadata are available as extensions to the MAJOR.MINOR.PATCH format.

## Test

### Requirements

- A Controller will attempt to bind to port 3000.
- A Service Proxy for the HTTP Server will attempt to bind to port 3080.
- A Service Proxy for the HTTPS Server will attempt to bind to port 3443.
- The test script will use `openssl` in order to generate a certificate and key.

### Run the test

#### Clone the repository.

```bash
git clone https://github.com/faranalytics/socketnaut.git
```

#### Change directory into the root of the repository.

```bash
cd socketnaut
```

#### Install dependencies.

```bash
npm install && npm update
```

#### Run the test.

```bash
npm test
```

Use the `level=INFO` argument to display the connection distribution.

```bash
npm test level=INFO
```

## Support

If you have a feature request or run into any issues, feel free to submit an [issue](https://github.com/faranalytics/socketnaut/issues) or start a [discussion](https://github.com/faranalytics/socketnaut/discussions). You’re also welcome to reach out directly to one of the authors.

- [Adam Patterson](https://github.com/adamjpatterson)
