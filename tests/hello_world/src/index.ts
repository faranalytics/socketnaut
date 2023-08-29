import * as net from 'node:net';
import { createServiceProxy } from 'socketnaut';
import { consoleHandler, Level } from 'socketnaut';

consoleHandler.setLevel(Level['DEBUG']);

const proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 4,
    maxWorkers: 100,
    workersCheckingInterval: 1e6,
    workerURL: require.resolve('./http_server.js')
});

proxy.server.listen({ port: 3000, host: '0.0.0.0' });