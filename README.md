# **Socketnaut** 

Scalable multithreaded Node.js servers made easy.

Socketnaut makes scaling native Node.js HTTP servers (e.g., TCP, HTTP, HTTPS) easy.  Each socketnaut app consists of a TCP Proxy and a pool of HTTP Services.  When the Service pool is exhausted, socketnaut will uniformly distribute incoming TCP sockets across the pool of allocated Services.  This strategy allows for both distribution and parallel processing of incoming requests.  Socketnaut exposes the same API for HTTP requests provided by Node's `http.Server` and `https.Server`; hence, if you know the [Node API](https://nodejs.org/docs/latest-v18.x/api/http.html), you already know how to build applications on socketnaut!

## Features
- **Socketnaut requires 0 out-of-org dependencies**.  Socketnaut's dependencies are published and maintained by the **FAR Analytics and Research** org.  
Dependencies:
    - The [`farar/memoir`](https://www.npmjs.com/package/memoir) logger.
    - The [`farar/port_agent`](https://www.npmjs.com/package/port_agent) RPC facility.
- The socketnaut `Proxy` and `Service` constructors consume native Node [`net.Server`](https://nodejs.org/docs/latest-v18.x/api/net.html) and [`http.Server`](https://nodejs.org/docs/latest-v18.x/api/http.html) instances; *you can configure them however you choose*.
- The [`http.IncomingMessage`](https://nodejs.org/docs/latest-v18.x/api/http.html#class-httpincomingmessage) and [`http.ServerResponse`](https://nodejs.org/docs/latest-v18.x/api/http.html#class-httpserverresponse) objects passed to `request` listeners are unadulterated native Node objects - nothing added - nothing removed.
- Import socketnaut as a Node.js module (see the [Hello World!](#an-instance-of-hello-world-example) example) or take advantage of the packaged type definitions and import it into your TypeScript project. 

## Table of Contents
1. [Installation](#installation)
2. [Concepts](#concepts)
3. [API](#api)
4. [Usage](#usage)
5. [Examples](#examples)
    - [*An instance of Hello World!.*](#an-instance-of-hello-world-example)
6. [Tuning Strategies](#tuning-strategies)
7. [Logging](#logging)
8. [Extending Socketnaut](#extending-socketnaut)
9. [FAQ](#faq)

## Installation

```bash
npm install socketnaut
``` 
## Concepts

The socketnaut framework consists of the following 2 concepts.

### Proxy

### Service

## API

### The Proxy Class

### The Service Class

## Usage

## Examples

### *An instance of Hello World!.* <sup><sup>(example)</sup></sup>

## Tuning Strategies

## Logging

## Extending Socketnaut

## FAQ

### What kind of scaling implementation is this?
Socketnaut is a multithreaded *vertical* scaling implementation.  However, socketnaut could be containerized and scaled horizontally.