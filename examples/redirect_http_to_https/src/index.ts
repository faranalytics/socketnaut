import * as net from 'node:net';
import { Level, createServiceProxy } from 'socketnaut';

const http_proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 2,
    maxWorkers: 2,
    workerURL: require.resolve('./http_server.js')
});

http_proxy.logHandler.setLevel(Level.DEBUG)

http_proxy.server.listen({ port: 3000, host: '0.0.0.0' });

const https_proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 2,
    maxWorkers: 10,
    workerURL: require.resolve('./https_server.js')
});

https_proxy.logHandler.setLevel(Level.DEBUG)

https_proxy.server.listen({ port: 3443, host: '0.0.0.0' });