import * as net from 'node:net';

import { Proxy } from 'socketnaut';

let proxy = new Proxy({
    server: net.createServer(),
    listenOptions: { port: 3000, host: '0.0.0.0' },
    minWorkers: 4,
    maxWorkers: 100,
    workersCheckingInterval: 1e6,
    workerUrl: './dist/http_service.js'
})

proxy.server.on('connection', () => {
    console.log('Proxy connection.')
});

