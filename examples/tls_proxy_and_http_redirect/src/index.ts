/* eslint-disable @typescript-eslint/no-unused-vars */
import * as net from 'node:net';
import * as tls from 'node:tls';
import * as fs from 'fs';
import * as os from 'os';
import * as pth from 'path';
import { Level, createServiceProxy } from 'socketnaut';
import { WorkerAgent } from 'socketnaut/dist/worker_agent.js';

// Create a Service Proxy for redirecting HTTP requests to the secure port.
const httpProxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 2,
    maxWorkers: 2,
    workersCheckingInterval: 1e4,
    workerURL: new URL('./http_redirect_service.js', import.meta.url)
});

httpProxy.log.setLevel(Level.DEBUG);

httpProxy.server.listen({ port: 3080, host: '0.0.0.0' });

// Create a Service Proxy for handling HTTP requests.
const tlsServer = tls.createServer({
    key: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/key.pem')),
    cert: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/crt.pem'))
});

const tlsProxy = createServiceProxy({
    server: tlsServer,
    minWorkers: 4,
    maxWorkers: 42,
    workerURL: new URL('./service.js', import.meta.url)
});

tlsProxy.log.setLevel(Level.DEBUG);

tlsProxy.server.listen({ port: 3443, host: '0.0.0.0' });

// Visually display the state of the HTTP server pool each 1000ms.
setInterval(() => {
    tlsProxy.log.info?.(`Status: ${tlsProxy.agents.length}, ${tlsProxy.maxWorkers}, ${tlsProxy.minWorkers}.`);
    console.log(`Server pool connections: ${JSON.stringify(tlsProxy.agents.map((value: WorkerAgent) => value.connections))}`);
}, 1000);