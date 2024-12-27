import { exec, ExecException } from 'node:child_process';
import * as net from 'node:net';
import { createServiceProxy, WorkerAgent } from 'socketnaut';
import * as https from 'node:https';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as pth from 'node:path';
import { once } from 'node:events';
import * as http from 'node:http';
import * as assert from 'node:assert';

function cb(error: ExecException | null, stdout: string, stderr: string) {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
}

const TLS_PATH = pth.join(pth.dirname(import.meta.dirname), 'tls');
const KEY_PATH = pth.join(TLS_PATH, "key.pem");
const CERT_PATH = pth.join(TLS_PATH, "cert.pem");

await once(
    exec(
        `openssl req -newkey rsa:2048 -nodes -x509 -subj "/CN=localhost" \
        -keyout ${KEY_PATH} \
        -out ${CERT_PATH}`, cb),
    'exit'
);

const proxy3080 = createServiceProxy({
    server: net.createServer(),
    workerCount: 2,
    workersCheckingInterval: 1e4,
    workerURL: new URL('./http_service.js', import.meta.url)
});
// proxy3080.log.setLevel(Level.ERROR);
proxy3080.server.listen({ port: 3080, host: '127.0.0.1' });

const proxy3443 = createServiceProxy({
    server: net.createServer(),
    workerCount: 1,
    workerURL: new URL('./https_service.js', import.meta.url)
});
// proxy3443.log.setLevel(Level.ERROR);
proxy3443.server.listen({ port: 3443, host: '127.0.0.1' });

const timeout = setInterval(() => {
    proxy3443.log.info(`proxy.agents.length: ${proxy3443.agents.length}, proxy.maxWorkers: ${proxy3443.maxWorkers}, proxy.minWorkers: ${proxy3443.minWorkers}.`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    console.log(`Connection Distribution: ${JSON.stringify(proxy3443.agents.map<number>((value: WorkerAgent) => value.connections))}`);
}, 1500);

await Promise.all([once(proxy3080, 'ready'), once(proxy3443, 'ready')]);


const DATA = crypto.randomBytes(1e5);
const PORT = 3443;
const PATH = '/';
const HOST = 'localhost';
const REQS = 1;

const promises: Array<Promise<unknown>> = [];

async function request(host: string, port: number, path: string, data: string | Buffer, certPath: string) {
    const req = https.request(
        {
            hostname: host,
            port: port,
            path: path,
            method: 'POST',
            ca: [fs.readFileSync(certPath)],
            timeout: 1e6,
            headers: { 'content-length': DATA.length }
        });

    req.end(DATA);

    console.log(req.getHeaders());

    const [res] = (await once(req, 'response'));

    const chunks: Array<Buffer> = [];

    res.on('data', (datum: Buffer) => {
        chunks.push(datum);
    });

    await once(res, 'end');
    console.log(chunks.length, DATA.length, Buffer.concat(chunks).length)
    return Buffer.concat(chunks);
}

for (let i = 0; i < REQS; i++) {
    promises.push(request(HOST, PORT, PATH, DATA, CERT_PATH));
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
        console.log((result.value as Buffer).length, DATA.length)
        assert.strictEqual((result.value as Buffer).toString(), DATA.toString());
    }
}

console.log(`Error Count: ${errorCount}`);

clearInterval(timeout);
await proxy3080.shutdown().catch(console.error);
await proxy3443.shutdown().catch(console.error);