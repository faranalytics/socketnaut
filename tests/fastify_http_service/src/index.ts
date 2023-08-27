import * as net from 'node:net';
import { ServiceProxy } from 'socketnaut';

let fastify_proxy = new ServiceProxy({
    server: net.createServer(),
    minServers: 4,
    maxServers: 100,
    servicesCheckingInterval: 1e6,
    serverURL: require.resolve('./fastify_http_service.js')
})

fastify_proxy.server.listen({ port: 3000, host: '0.0.0.0' });