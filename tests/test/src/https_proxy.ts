import { exec } from 'node:child_process';
import * as net from 'node:net';
import { createServiceProxy, SyslogLevel, WorkerAgent } from 'socketnaut';
import * as pth from 'node:path';
import { once } from 'node:events';

const TLS_PATH = pth.join(pth.dirname(import.meta.dirname), 'secrets');
const KEY_PATH = pth.join(TLS_PATH, "key.pem");
const CERT_PATH = pth.join(TLS_PATH, "cert.pem");

await once(
    exec(
        `openssl req -newkey rsa:2048 -nodes -x509 -subj "/CN=localhost" \
        -keyout ${KEY_PATH} \
        -out ${CERT_PATH}`, (...args) => {
        args.forEach((arg, index) => arg ? (index + 1) % 2 == 0 ? console.log(arg) : console.error(arg) : null)
    }),
    'exit'
);

const proxy = createServiceProxy({
    server: net.createServer(),
    workerCount: 1e2,
    workerURL: new URL('./https_service.js', import.meta.url)
});

proxy.server.listen({ port: 3443, host: '127.0.0.1' });

proxy.log.setLevel(SyslogLevel.INFO);

const timeout = setInterval(() => {
    proxy.log.info(`proxy.agents.length: ${proxy.agents.length}, proxy.maxWorkers: ${proxy.maxWorkers}, proxy.minWorkers: ${proxy.minWorkers}.`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    proxy.log.info(`Connection Distribution: ${JSON.stringify(proxy.agents.map<number>((value: WorkerAgent) => value.connections))}`);
}, 1500);

await once(proxy, 'ready');

process.send?.('ready');

process.on('message', async (message)=>{
    try {
        proxy.log.info(`Message received: ${message}`);
        if (message == 'exit') {
            await proxy.shutdown();
            clearInterval(timeout);
            process.exit();
        }
    }
    catch(err) {
        console.error(err);
    }
});