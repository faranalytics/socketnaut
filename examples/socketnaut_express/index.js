import * as net from 'node:net';
import { ServiceProxy } from 'socketnaut';

const proxy = new ServiceProxy({
    server: net.createServer(),
    minServers: 42,
    maxServers: 100,
    serversCheckingInterval: 1e6,
    workerURL: './http_server.js'
});

proxy.server.listen({ port: 3000, host: '0.0.0.0' });