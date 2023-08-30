import * as net from 'node:net';
import { createServiceProxy } from 'socketnaut';

const http_proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 2,
    maxWorkers: 2,
    workersCheckingInterval: 1e6,
    workerURL: require.resolve('./http_server.js')
});

http_proxy.server.listen({ port: 3000, host: '0.0.0.0' });

const https_proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 2,
    maxWorkers: 10,
    workersCheckingInterval: 1e6,
    workerURL: require.resolve('./https_server.js')
});

https_proxy.server.listen({ port: 3443, host: '0.0.0.0' });