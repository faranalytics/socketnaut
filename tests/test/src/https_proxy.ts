import { exec } from 'node:child_process';
import * as net from 'node:net';
import { createServiceProxy, SyslogLevel, WorkerAgent, log} from 'socketnaut';
import { once } from 'node:events';
import { CERT_PATH, KEY_PATH } from './paths.js';
import { listen } from './utils.js';

await once(
    exec(
        `openssl req -newkey rsa:2048 -nodes -x509 -subj "/CN=localhost" \
        -keyout ${KEY_PATH} \
        -out ${CERT_PATH}`, (...args) => {
        args.forEach((arg, index) => arg ? log.debug(arg.toString()) : null)
    }),
    'exit'
);

const proxy = createServiceProxy({
    server: net.createServer(),
    workerCount: 1e2,
    workerURL: new URL('./https_service.js', import.meta.url)
});

proxy.server.listen({ port: 3443, host: '127.0.0.1' });

proxy.log.setLevel(SyslogLevel.WARN);

const timeout = setInterval(() => {
    proxy.log.info(`proxy.agents.length: ${proxy.agents.length}, proxy.maxWorkers: ${proxy.maxWorkers}, proxy.minWorkers: ${proxy.minWorkers}.`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    proxy.log.info(`Connection Distribution: ${JSON.stringify(proxy.agents.map<number>((value: WorkerAgent) => value.connections))}`);
}, 1500);

await once(proxy, 'ready');

process.send?.('ready');

await listen(process, 'exit');
await proxy.shutdown();
clearInterval(timeout);
process.exit();