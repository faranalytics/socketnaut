/* eslint-disable @typescript-eslint/no-unused-vars */
import * as https from 'node:https';
import * as fs from 'fs';
import * as http from 'node:http';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Level, createServiceAgent, ProxySocketAddressInfo } from 'socketnaut';
import { Writable } from 'node:stream';
import { KEY_PATH, CERT_PATH } from './paths.js';

class StreamBuffer extends Writable {
    public buffer: Buffer = Buffer.allocUnsafe(0);
    _write(chunk: string | Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        if (!(chunk instanceof Buffer)) {
            chunk = Buffer.from(chunk);
        }
        this.buffer = Buffer.concat([this.buffer, chunk]);
        callback();
    }
}

const server = https.createServer({
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH)
});

const agent = createServiceAgent({ server });

agent.log.setLevel(Level.WARN);

// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/require-await
server.on('request', async (req: http.IncomingMessage, res: http.ServerResponse) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const proxyAddressInfo: ProxySocketAddressInfo = await agent.requestProxySocketAddressInfo(req.socket);
    // console.log(proxyAddressInfo);
    const streamBuf = new StreamBuffer();
    req.pipe(streamBuf);
    req.on('end', () => {
        res.writeHead(200);
        res.end(streamBuf.buffer);
    });
});

server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.