import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'fs';
import * as os from 'os';
import * as pth from 'path';
import { Level, createServiceAgent } from 'socketnaut';

const server = https.createServer(
    {
        key: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/key.pem')),
        cert: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/crt.pem'))
    }); // Configure this HTTPS server however you choose.

server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    res.end('Hello, World!');
});

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });

agent.logHandler.setLevel(Level.DEBUG);

