import * as http from 'node:http';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Level, createServiceAgent, ProxySocketAddressInfo } from 'socketnaut';

const agent = createServiceAgent({
    server: http.createServer()
});

agent.log.setLevel(Level.DEBUG);

// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/require-await
agent.server.on('request', async (req: http.IncomingMessage, res: http.ServerResponse) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const proxyAddressInfo: ProxySocketAddressInfo = await agent.requestProxySocketAddressInfo(req.socket);
    console.log(proxyAddressInfo);
    req.pipe(res);
});

agent.server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.