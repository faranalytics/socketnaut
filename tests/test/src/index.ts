import * as cp from 'node:child_process';
import * as https from 'node:https';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as pth from 'node:path';
import * as os from 'node:os';
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
                ca: [fs.readFileSync(pth.resolve(os.homedir(), 'secrets/cert.pem'))],
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

let errorCount = 0;
for (const result of results) {
    if (result.status == 'rejected') {
        console.log(result.reason);
        errorCount = errorCount + 1;
    }
    if (result.status == 'fulfilled') {
        assert.strictEqual(result.value?.toString(), DATA);
    }
}

proxy.send({ event: 'shutdown' });

proxy.on('exit', () => {
    console.log(`Error Count: ${errorCount}`);
});