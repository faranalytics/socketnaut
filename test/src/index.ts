import * as net from 'node:net';

import { Proxy } from 'socketnaut';

let proxy = new Proxy({
    server: net.createServer(),
    minServices: 4,
    maxServices: 100,
    servicesCheckingInterval: 1e6,
    serviceURL: require.resolve('./fastify_http_service.js')
})

proxy.server.listen({ port: 3000, host: '0.0.0.0' });
