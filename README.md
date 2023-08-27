# **Socketnaut** 

Scalable multithreaded Node.js servers made easy.

![Eptanaut](./transport.svg)

Socketnaut makes scaling native Node.js servers (e.g., HTTP, HTTPS, TCP) easy.  Each Socketnaut Service consists of a TCP Proxy and a pool of HTTP servers.  When the server pool is exhausted, Socketnaut will uniformly distribute incoming TCP sockets across the pool of allocated servers.  This strategy allows for both distribution and parallel processing of incoming requests.  Socketnaut exposes the same API for HTTP requests provided by Node's `http.Server` and `https.Server`; hence, if you know the [Node API](https://nodejs.org/docs/latest-v18.x/api/http.html), you already know how to build applications on Socketnaut!

## Features
- **Socketnaut requires 0 out-of-org dependencies**.  Socketnaut's dependencies are published and maintained by the **FAR Analytics and Research** org.  
Dependencies:
    - The [`farar/memoir`](https://www.npmjs.com/package/memoir) logger.
    - The [`farar/port_agent`](https://www.npmjs.com/package/port_agent) RPC facility.
- The Socketnaut `ServiceProxy` and `ServiceServer` constructors consume native Node [`net.Server`](https://nodejs.org/docs/latest-v18.x/api/net.html) and [`http.Server`](https://nodejs.org/docs/latest-v18.x/api/http.html) instances; *you can configure them however you choose*.
- The [`http.IncomingMessage`](https://nodejs.org/docs/latest-v18.x/api/http.html#class-httpincomingmessage) and [`http.ServerResponse`](https://nodejs.org/docs/latest-v18.x/api/http.html#class-httpserverresponse) objects passed to `request` listeners are unadulterated native Node objects - nothing added - nothing removed.
- Import Socketnaut as a Node.js module (see the [Hello World!](#an-instance-of-hello-world-example) example) or take advantage of the packaged type definitions and import it into your TypeScript project. 

## Table of Contents
1. [Installation](#installation)
2. [Concepts](#concepts)
3. [API](#api)
4. [Usage](#usage)
5. [Examples](#examples)
    - [*An instance of Hello World!.*](#an-instance-of-hello-world-example)
6. [Tuning Strategies](#tuning-strategies)
7. [Logging](#logging)
8. [FAQ](#faq)

## Installation

```bash
npm install Socketnaut
``` 
## Concepts

Socketnaut consists of the following 2 Service concepts.

### ServiceProxy

A `ServiceProxy` is used in order to bind a TCP server to a specified port (usu. a public port).  The `ServiceProxy` uniformly distributes TCP connections to `ServiceServer`s (e.g., HTTP servers) in the thread pool.  The `ServiceProxy` manages the thread pool according to the values assigned to the `minServers` and `maxServers` parameters.  

### ServiceServer

A `ServiceServer` can consume any native Node.js server (e.g., HTTP, HTTPS, TCP).

## API

### The ServiceProxy Class

#### socketnaut.ServiceProxy(options)
- options `<ServiceProxyOptions>`

    - `maxServers` `<number>` Optional argument that specifies the maximum number of `Server` threads permitted.

    - `minServers` `<number>` Optional argument that specifies the minimum number of `Server` threads permitted. **Default**: `0`

    - `server` `<node:net.Server>` A `net.Server` configured however you choose.

    - `serversCheckingInterval` `<number>` Optional argument that specifies the approximate interval (milliseconds) at which inactive `Server`s will be cleaned up. **Default**: `30000`

    - `workerOptions` `<node:worker_threads.WorkerOptions>` Optional `WorkerOptions` passed to the `worker_threads.Worker` constructor.

### The ServiceServer Class

#### socketnaut.ServiceServer(options)
- options `<ServiceServerOptions>`

    - `server` `<http.Server>` or `<https.Server>` A `http.Server` configured however you choose.

## Usage

Each Socketnaut Service consists of at least one `ServiceProxy` and a respective `ServiceServer`.  Please see the [examples](#examples) section for how to create a Socketnaut Service.

## Examples

### *An instance of Hello World!.* <sup><sup>(example)</sup></sup>

`index.js`
```js
import * as net from 'node:net';
import { ServiceProxy } from 'socketnaut';

let hello_world_proxy = new ServiceProxy({
    server: net.createServer(),
    minServers: 4,
    maxServers: 100,
    servicesCheckingInterval: 1e6,
    serviceURL: require.resolve('./hello_world_http_service.js')
})

hello_world_proxy.server.listen({ port: 3000, host: '0.0.0.0' });
```

`hello_world_http_service.js`
```js
import * as http from 'node:http';
import { ServiceServer } from 'socketnaut';

let service = new ServiceServer({
    server: http.createServer()
});

service.server.on('request', (req, res) => {
    res.end('Hello World!');
});

service.server.listen({ port: 0, host: '127.0.0.1' });
```

### *A Socketnaut Service that uses Fastify's `serverFactory` facility.* <sup><sup>(example)</sup></sup>

`index.js`
```js
import * as net from 'node:net';
import { ServiceProxy } from 'socketnaut';

let fastify_proxy = new ServiceProxy({
    server: net.createServer(),
    minServers: 4,
    maxServers: 100,
    servicesCheckingInterval: 1e6,
    serviceURL: require.resolve('./fastify_http_service.js')
})

fastify_proxy.server.listen({ port: 3010, host: '0.0.0.0' });
```

`fastify_http_service.js`
```js
import * as http from 'node:http';
import { ServiceServer } from 'socketnaut';
import Fastify from 'fastify'

const serverFactory = (handler, opts) => {
    let service = new ServiceServer({
        server: http.createServer((req, res) => { 
            handler(req, res) 
        })
    });

    return service.server;
}

const fastify = Fastify({ serverFactory });

fastify.post('/blocking-request', (req, reply) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now());
    reply.send({ hello: 'world' });
});

fastify.listen({ port: 0, host: '127.0.0.1' });
```



## Tuning Strategies

Socketnaut scaling can be tuned by specifying a minimum and maximum number of allocated `Server` threads.  The minimum and maximum number of `Server` threads can be specified in the constructor of each `Proxy` by assigning values to the `minServers` and `maxServers` parameters.  Further, the `servicesCheckingInterval` can be used in order to set the frequency at which `Server`s are culled until the `minServers` threshold is reached.

### `Proxy` constructor parameters relevant to tuning:
#### **socketnaut.Proxy(options)**
- options `<ProxyOptions>`
    - `minServers` `<number>` An argument that specifies the minimum number of `Server` threads permitted.

    - `maxServers` `<number>` An argument that specifies the maximum number of `Server` threads permitted.

    - `servicesCheckingInterval` `<number>` An argument that specifies the approximate interval at which inactive `Server`s will be cleaned up. **Default**: `30000`

The `minThreads` argument specifies the minimum number of Worker threads permitted.  `minThreads` threads will be instantiated when the eptanaut Server starts.  Eptanaut will not allow the thread pool to drop below the specified threshold.

The `maxThreads` argument is a hard limit. 

The `threadsCheckingInterval` specifies the approximate interval at which eptanaut will attempt to clean up inactive threads.  If eptanaut's Proxy finds that a thread has 0 connections, eptanaut will remove it from the pool and send it a notification requesting that it close its server and exit.  The default interval is `30000` milliseconds.

By variously specifying `minThreads`, `maxThreads`, `threadsCheckingInterval` you can tune eptanaut according to the requirements of your environment.

## Logging

Socketnaut uses the Node.js `memoir` logging facility.  You can set the log level in your `index.js` by passing a valid log level argument to the `logLevel` parameter of the `ServiceProxy` constructor.

Socketnaut exports its instance of a `memoir` logger, named `socketlog`, which can be consumed and reconfigured by another `memoir` logger; see the `memoir` documentation for how to do this - *or use the logger of your choice*.

## FAQ

### What kind of scaling implementation is this?
Socketnaut is a multithreaded *vertical* scaling implementation. However, Socketnaut could be containerized and scaled horizontally.

### How is Socketnaut related to [eptanaut](https://github.com/faranalytics/eptanaut)?
Socketnaut is an offshoot from the eptanaut project. Socketnaut provides functionality similar to eptanaut; however, it implements a clear separation between the Proxy and Server concepts.