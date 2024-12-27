import * as net from 'node:net';
import { createServiceProxy, Level, consoleHandler} from 'socketnaut';

const server = net.createServer(); // Configure this TCP Server however you choose.

server.listen({ port: 3080, host: '0.0.0.0' });

const proxy = createServiceProxy({
    server,
    workerCount: 42,
    workerURL: new URL('./http_server.js', import.meta.url)
});

proxy.log.setLevel(Level.INFO);
