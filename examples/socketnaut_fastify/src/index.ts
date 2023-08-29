import * as net from 'node:net';
import { ServiceProxy, consoleHandler, Level } from 'socketnaut';

consoleHandler.setLevel(Level['DEBUG']);

let proxy = new ServiceProxy({
    server: net.createServer(),
    minServers: 4,
    maxServers: 100,
    serversCheckingInterval: 1e6,
    workerURL: require.resolve('./http_server.js')
})

proxy.server.listen({ port: 3000, host: '0.0.0.0' });