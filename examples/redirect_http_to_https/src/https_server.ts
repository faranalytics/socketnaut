import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'fs';
import { createServiceAgent } from 'socketnaut';

const service = createServiceAgent({
    server: https.createServer(
        {
            key: fs.readFileSync('../../../secrets/key.pem'),
            cert: fs.readFileSync('../../../secrets/crt.pem')
        }) // Configure this HTTPS server however you choose.
});

service.server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    res.end('Hello World!');
});

service.server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.        