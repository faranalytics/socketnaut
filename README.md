# **Socketnaut** 

Scalable multithreaded Node.js servers made easy.

![Socketnaut](./transport.svg)

Socketnaut makes scaling native Node.js servers (e.g., HTTP, HTTPS, TCP) easy.  Each Socketnaut **Service** consists of a TCP Proxy and a pool of HTTP servers.  When the server pool is exhausted, Socketnaut will uniformly distribute incoming TCP sockets across the pool of allocated servers.  This strategy allows for both distribution and parallel processing of incoming requests.  Socketnaut exposes the same API for HTTP requests provided by Node's `http.Server` and `https.Server`; hence, if you know the [Node API](https://nodejs.org/docs/latest-v18.x/api/http.html), you already know how to build applications on Socketnaut!

Socketnaut can be combined with performant single threaded HTTP server implementations in order to easily scale otherwise single threaded requests.

## Features
- **Socketnaut requires 0 out-of-org dependencies**.  Socketnaut's dependencies are published and maintained by the **FAR Analytics and Research** org.  
Dependencies:
    - The [`farar/memoir`](https://www.npmjs.com/package/memoir) logger.
    - The [`farar/port_agent`](https://www.npmjs.com/package/port_agent) RPC facility.
- The Socketnaut `ServiceProxy` and `ServiceServer` constructors consume native Node [`net.Server`](https://nodejs.org/docs/latest-v18.x/api/net.html), [`http.Server`](https://nodejs.org/docs/latest-v18.x/api/http.html), and [`https.Server`](https://nodejs.org/docs/latest-v18.x/api/https.html) instances; *you can configure them however you choose*.
- The [`http.IncomingMessage`](https://nodejs.org/docs/latest-v18.x/api/http.html#class-httpincomingmessage) and [`http.ServerResponse`](https://nodejs.org/docs/latest-v18.x/api/http.html#class-httpserverresponse) objects passed to `request` listeners are unadulterated native Node objects - nothing added - nothing removed.
- Import Socketnaut as a Node.js module (see the [Hello World!](#an-instance-of-hello-world-example) example) or take advantage of the packaged type definitions and import it into your TypeScript project. 

## Table of Contents
1. [Installation](#installation)
2. [Concepts](#concepts)
3. [API](#api)
4. [Usage](#usage)
5. [Examples](#examples)
    - [*An instance of Hello World!*](#an-instance-of-hello-world-example)
    - [*Use Socketnaut to scale the main thread of a Fastify server.*](#use-socketnaut-to-scale-the-main-thread-of-a-fastify-server-example)
    - [*Use Socketnaut to scale the main thread of an Express server.*](#use-socketnaut-to-scale-the-main-thread-of-an-express-server-example)
6. [Tuning Strategies](#tuning-strategies)
7. [Logging](#logging)
8. [FAQ](#faq)

## Installation

```bash
npm install socketnaut
``` 
## Concepts

Socketnaut consists of the following 2 Service concepts.

### ServiceProxy

A `ServiceProxy` is used in order to bind a TCP server to a specified port (usu. a public port).  The `ServiceProxy` uniformly distributes TCP connections to `ServiceServer`s (e.g., HTTP servers) in the thread pool.  The `ServiceProxy` manages the thread pool according to the values assigned to the `minServers` and `maxServers` parameters.  

### ServiceServer

A `ServiceServer` can consume any native Node.js server (e.g., HTTP, HTTPS, TCP).  The "wrapped" Node.js server is used the same way it is used natively; it can even be passed into an external routing facility. 

## API

### The `ServiceProxy` Class

#### socketnaut.ServiceProxy(options)
- options `<ServiceProxyOptions>`

    - `maxServers` `<number>` Optional argument that specifies the maximum number of `ServiceServer` threads permitted.

    - `minServers` `<number>` Optional argument that specifies the minimum number of `ServiceServer` threads permitted. **Default**: `0`

    - `server` `<node:net.Server>` A `net.Server` configured however you choose.

    - `serversCheckingInterval` `<number>` Optional argument that specifies the approximate interval (milliseconds) at which inactive `ServiceServer`s will be cleaned up. **Default**: `30000`

    - `workerOptions` `<node:worker_threads.WorkerOptions>` Optional `WorkerOptions` passed to the `worker_threads.Worker` constructor.

    - `workerURL` `<string>` or `<URL>` The URL or path to the `.js` file that contains the `ServiceServer` instance e.g., `require.resolve('./server.js')`.  This is the module that will be scaled according to the values specified for `minServers` and `maxServers`.  Please see the [Examples](#examples) section for how to reference a `ServiceServer` module. 

### The `ServiceServer` Class

#### socketnaut.ServiceServer(options)
- options `<ServiceServerOptions>`

    - `server` `<node:http.Server>` or `<node:https.Server>` or `<node:net.Server>` A native Node.js `Server` configured however you choose.

## Usage

Each Socketnaut Service consists of at least one `ServiceProxy` and a respective `ServiceServer`.  Please see the [examples](#examples) section for how to create a Socketnaut Service.

## Examples

### *An instance of Hello World!* <sup><sup>(example)</sup></sup>

`index.js`
```js
import * as net from 'node:net';
import { ServiceProxy } from 'socketnaut';

const proxy = new ServiceProxy({
    server: net.createServer(),
    minServers: 42,
    maxServers: 100,
    serversCheckingInterval: 1e6,
    workerURL: './http_server.js'
});

proxy.server.listen({ port: 3000, host: '0.0.0.0' });
```

`http_server.js`
```js
import * as http from 'node:http';
import { ServiceServer } from 'socketnaut';

const service = new ServiceServer({
    server: http.createServer() // Configure this HTTP server however you choose.
});

service.server.on('request', (req, res) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    res.end('Hello World!');
});

service.server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.
```
### *Use Socketnaut to scale the main thread of a Fastify server.* <sup><sup>(example)</sup></sup>

Please see the [Fastify](https://github.com/faranalytics/socketnaut/tree/main/examples/socketnaut_fastify) example for a working implementation.

### *Use Socketnaut to scale the main thread of an Express server.* <sup><sup>(example)</sup></sup>

Please see the [Express](https://github.com/faranalytics/socketnaut/tree/main/examples/socketnaut_express) example for a working implementation.

## Tuning Strategies

Socketnaut scaling can be tuned by specifying a minimum and maximum number of allocated `ServiceServer` threads.  The minimum and maximum number of `ServiceServer` threads can be specified in the constructor of each `ServiceProxy` by assigning values to the `minServers` and `maxServers` parameters.  Further, the `serversCheckingInterval` can be used in order to set the frequency at which `ServiceServer`s are culled until the `minServers` threshold is reached.

### `ServiceProxy` constructor parameters relevant to tuning:
#### **socketnaut.ServiceProxy(options)**
- options `<ServiceProxyOptions>`
    - `minServers` `<number>` An argument that specifies the minimum number of `ServiceServer` threads permitted.

    - `maxServers` `<number>` An argument that specifies the maximum number of `ServiceServer` threads permitted.

    - `serversCheckingInterval` `<number>` An argument that specifies the approximate interval at which inactive `ServiceServer`s will be cleaned up. **Default**: `30000`

The `minServers` argument specifies the minimum number of Worker threads permitted.  `minServers` threads will be instantiated when the Socketnaut Server starts.  Socketnaut will not allow the thread pool to drop below the specified threshold.

The `maxServers` argument is a hard limit. 

The `serversCheckingInterval` specifies the approximate interval at which Socketnaut will attempt to clean up inactive threads.  If Socketnaut's Proxy finds that a thread has 0 connections, Socketnaut will remove it from the pool and send it a notification requesting that it close its server and exit.  The default interval is `30000` milliseconds.

By variously specifying `minServers`, `maxServers`, `serversCheckingInterval` you can tune Socketnaut according to the requirements of your environment.

## Logging

Socketnaut uses the Node.js `memoir` logging facility.  You can set Socketnaut's log level in your `index.js` by importing the memoir `consoleHandler` and setting it's `logLevel` to `DEBUG` | `INFO` | `WARN` | `ERROR`.  The default is `DEBUG`.  For example:

`index.js`
```js
import { consoleHandler, Level } from 'socketnaut';

consoleHandler.setLevel(Level['DEBUG']);
```

Socketnaut exports its instance of a `memoir` logger, named `socketlog`, which can be consumed and reconfigured by another `memoir` logger; see the `memoir` documentation for how to do this - *or use the logger of your choice*.

## FAQ

### What kind of scaling implementation is this?
Socketnaut is a multithreaded *vertical* scaling implementation. However, Socketnaut could be containerized and scaled horizontally.