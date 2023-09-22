import * as http from 'node:http';
import { createServiceAgent, Level } from 'socketnaut';

const server = http.createServer(); // Configure this HTTP Server however you choose.

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });

server.on('request', async (req: http.IncomingMessage, res: http.ServerResponse) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    const proxyAddressInfo = await agent.requestProxySocketAddressInfo(req.socket);
    console.log(proxyAddressInfo);
    req.pipe(res);
});

agent.log.setLevel(Level.DEBUG);