/* eslint-disable @typescript-eslint/no-unused-vars */
import * as net from 'node:net';
import * as tls from 'node:tls';
import * as http from 'node:http';
import * as fs from 'fs';
import * as os from 'os';
import * as pth from 'path';
import { Level, createServiceProxy } from 'socketnaut';
// import { WorkerAgent } from '../../../dist/worker_agent.js';

// const http_proxy = createServiceProxy({
//     server: net.createServer(),
//     minWorkers: 2,
//     maxWorkers: 2,
//     workersCheckingInterval: 1e4,
//     workerURL: new URL('./http_service.js', import.meta.url)
// });

// http_proxy.log.setLevel(Level.INFO);

// http_proxy.server.listen({ port: 3080, host: '0.0.0.0' });

// const https_proxy = createServiceProxy({
//     server: net.createServer(),
//     minWorkers: 2,
//     maxWorkers: 10,
//     workerURL: new URL('./https_server.js', import.meta.url)
// });

// https_proxy.logHandler.setLevel(Level.DEBUG);

// https_proxy.server.listen({ port: 3443, host: '0.0.0.0' });

// setInterval(() => {
//     https_proxy.log.info?.(`Status: ${https_proxy.agents.length}, ${https_proxy.maxWorkers}, ${https_proxy.minWorkers}.`);
//     console.log(JSON.stringify(https_proxy.agents.map((value: WorkerAgent) => value.connections)));
// }, 1000);

const tlsServer = tls.createServer({
    key: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/key.pem')),
    cert: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/crt.pem'))
});

const tlsProxy = createServiceProxy({
    server: tlsServer,
    minWorkers: 2,
    maxWorkers: 10,
    workerURL: new URL('./service.js', import.meta.url)
});

tlsProxy.log.setLevel(Level.DEBUG);

tlsProxy.server.listen({ port: 3443, host: '0.0.0.0' });
