import * as http from 'node:http';
import { createServiceAgent, Level } from 'socketnaut';

const server = http.createServer(); // Configure this HTTP Server however you choose.

server.on('request', (req, res) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    res.end('Hello, World!');
});

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });

agent.log.setLevel(Level.DEBUG);