import * as net from 'node:net';
import { createServiceProxy, Level } from 'socketnaut';

const server : net.Server= net.createServer(); // Configure this TCP Server however you choose.

server.listen({ port: 3080, host: '0.0.0.0' });

const proxy = createServiceProxy({
    server,
    workerCount: 42,
    workerURL: `import { tsImport } from "tsx/esm/api"; await tsImport("./http_server.ts", import.meta.url);`,
    workerOptions: { eval: true }
});

proxy.log.setLevel(Level.DEBUG);
