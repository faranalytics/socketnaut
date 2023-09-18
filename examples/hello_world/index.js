import * as net from 'node:net';
import { createServiceProxy, Level } from 'socketnaut';

const proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 4,
    maxWorkers: 42,
    workerURL: './http_server.js'
});

proxy.logHandler.setLevel(Level.DEBUG)

proxy.server.listen({ port: 3080, host: '0.0.0.0' });