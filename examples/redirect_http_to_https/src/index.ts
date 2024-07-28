import * as net from 'node:net';
import { createServiceProxy, Level } from 'socketnaut';

const http_proxy = createServiceProxy({
    server: net.createServer(), // Configure this TCP Server however you choose.
    minWorkers: 4,
    maxWorkers: 42,
    workerURL: new URL('./http_server.js', import.meta.url)
});

http_proxy.log.setLevel(Level.DEBUG)

http_proxy.server.listen({ port: 3080, host: '0.0.0.0' });

const https_proxy = createServiceProxy({
    server: net.createServer(), // Configure this TCP Server however you choose.
    minWorkers: 4,
    maxWorkers: 42,
    workerURL: new URL('./https_server.js', import.meta.url)
});

https_proxy.log.setLevel(Level.DEBUG);

https_proxy.server.listen({ port: 3443, host: '0.0.0.0' });