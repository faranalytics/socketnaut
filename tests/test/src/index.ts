import { fork } from 'node:child_process';
import { once } from 'node:events';
import * as crypto from 'node:crypto';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as assert from 'node:assert';
import { dispatch, listen } from './utils.js';
import {CERT_PATH} from './paths.js';

const httpProxy = fork('./dist/http_proxy.js');
const httpsProxy = fork('./dist/https_proxy.js');

await Promise.all([listen(httpProxy, 'ready'), listen(httpsProxy, 'ready')]);

const DATA = crypto.randomBytes(1e5).toString();
const PORT = 3443;
const PATH = '/';
const HOST = 'localhost';
const REQS = 1e2;

const promises: Array<Promise<unknown>> = [];

for (let i = 0; i < REQS; i++) {
    const req = https.request(
        {
            hostname: HOST,
            port: PORT,
            path: PATH,
            method: 'POST',
            ca: [fs.readFileSync(CERT_PATH)],
            timeout: 1e6,
            headers: { 'content-length': Buffer.from(DATA).length }
        });

    promises.push(dispatch(req, DATA));
}

console.time('test');
const results = await Promise.allSettled(promises);
console.timeEnd('test');

let errorCount = 0;
for (const result of results) {
    if (result.status == 'rejected') {
        errorCount = errorCount + 1;
    }
    if (result.status == 'fulfilled') {
        // console.log((result.value as Buffer).length, Buffer.from(DATA).length)
        assert.strictEqual((result.value as Buffer).toString(), DATA.toString());
    }
}

console.log(`Error Count: ${errorCount}`);

httpsProxy.send('exit');
httpProxy.send('exit');

await Promise.all([once(httpsProxy, 'exit'), once(httpProxy, 'exit')]);
