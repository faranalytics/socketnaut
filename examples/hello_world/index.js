import * as net from 'node:net';
import { createServiceProxy } from 'socketnaut';

const proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 42,
    maxWorkers: 100,
    workersCheckingInterval: 1e6,
    workerURL: './http_server.js'
});

proxy.server.listen({ port: 3000, host: '0.0.0.0' });