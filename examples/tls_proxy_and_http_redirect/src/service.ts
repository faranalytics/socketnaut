import * as http from 'node:http';
// import { Level, createServiceAgent, ProxySocketAddressInfo } from 'socketnaut';
import { Level, createServiceAgent } from 'socketnaut';

const service = createServiceAgent({
    server: http.createServer()
});

service.log.setLevel(Level.INFO);

// eslint-disable-next-line @typescript-eslint/no-misused-promises
service.server.on('request', async (req: http.IncomingMessage, res: http.ServerResponse) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    // const proxyAddressInfo: ProxySocketAddressInfo = await service.requestProxySocketAddressInfo(req.socket);
    // console.log(proxyAddressInfo);
    req.pipe(res);
});

service.server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.