import { createServiceProxy, SyslogLevel, WorkerAgent } from 'socketnaut';
import * as net from 'node:net';
import { once } from 'node:events';
import { listen } from './utils.js';

const proxy = createServiceProxy({
    server: net.createServer(),
    workerCount: 2,
    workersCheckingInterval: 1e4,
    workerURL: new URL('./http_service.js', import.meta.url)
});

proxy.server.listen({ port: 3080, host: '127.0.0.1' });

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