import * as cp from 'node:child_process';
import * as https from 'node:https';
import * as crypto from 'node:crypto';
import * as fs from 'fs';
import { once } from 'node:events';
import * as http from 'node:http';
import * as assert from 'node:assert';

const proxy = cp.fork('./dist/proxy.js');
while ((await once(proxy, 'message'))[0] != 'ready');

const DATA = crypto.randomBytes(1e1).toString();
const PORT = 3443;
const PATH = '/';
const HOST = 'localhost';
const REQS = 1e4;

const promises: Array<Promise<unknown>> = [];
for (let i = 0; i < REQS; i++) {
    promises.push(new Promise((r, e) => {
        const req = https.request(
            {
                hostname: HOST,
                port: PORT,
                path: PATH,
                method: 'POST',
                ca: [fs.readFileSync('cert.pem')],
                timeout: 1e6
            });

        req.on('response', (res: http.IncomingMessage) => {
            const data: Array<Buffer> = [];
            res.on('data', (datum: Buffer) => {
                data.push(datum);
            });
            res.on('end', () => {
                r(data.toString());
            });
        });

        req.once('error', e);

        req.end(DATA);
    }));
}

console.time('test');
const results = await Promise.allSettled(promises);
console.timeEnd('test');

for (const result of results) {
    if (result.status == 'rejected') {
        console.log(result.reason);
    }
    if (result.status == 'fulfilled') {
        assert.strictEqual(result.value?.toString(), DATA);
    }
}

// proxy.send({ event: 'shutdown' });

proxy.on('exit', () => {
    console.log('exit');
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
// setTimeout(async () => {
//     console.log(await tlsProxy.shutdown());
//     console.log(await httpProxy.shutdown());
//     console.log('tlsProxy.agents.length', tlsProxy.agents.length);
//     console.log('httpProxy.agents.length', httpProxy.agents.length);
//     // setTimeout(() => {
//     //     console.log('tlsProxy.agents.length', tlsProxy.agents.length);
//     //     console.log('httpProxy.agents.length', httpProxy.agents.length);
//     // }, 3000);
// }, 6000);

