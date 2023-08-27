import * as net from 'node:net';
import { ServiceProxy } from 'socketnaut';

let hello_world_proxy = new ServiceProxy({
    server: net.createServer(),
    minServers: 4,
    maxServers: 100,
    servicesCheckingInterval: 1e6,
    workerURL: require.resolve('./hello_world_http_server.js')
})

hello_world_proxy.server.listen({ port: 3000, host: '0.0.0.0' });