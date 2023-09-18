import * as net from 'node:net';
import { Level, createServiceProxy } from 'socketnaut';

const http_proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 2,
    maxWorkers: 2,
    workerURL: new URL('./http_server.js', import.meta.url)
});

http_proxy.logHandler.setLevel(Level.DEBUG)

http_proxy.server.listen({ port: 3080, host: '0.0.0.0' });

const https_proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 2,
    maxWorkers: 10,
    workerURL: new URL('./https_server.js', import.meta.url)
});

https_proxy.logHandler.setLevel(Level.DEBUG)

https_proxy.server.listen({ port: 3443, host: '0.0.0.0' });