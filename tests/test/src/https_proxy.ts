import * as net from 'node:net';
import { createServiceProxy, SyslogLevel, WorkerAgent } from 'socketnaut';
import { once } from 'node:events';
import { listen } from './utils.js';
import { SyslogLevelT } from 'streams-logger';
import { KeysUppercase } from 'streams-logger/dist/commons/types.js';

const arg: Record<string, string> = process.argv.slice(2).reduce((prev: Record<string, string>, curr: string) => ({ ...prev, ...Object.fromEntries([curr.trim().split('=')]) }), {});
const LEVEL = <KeysUppercase<SyslogLevelT>><unknown>arg['level'];

const proxy = createServiceProxy({
    server: net.createServer(),
    workerCount: 1e2,
    workerURL: new URL('./https_service.js', import.meta.url),
    workerOptions: { argv: process.argv.slice(2) }
});

proxy.server.listen({ port: 3443, host: '127.0.0.1' });

proxy.log.setLevel(SyslogLevel[LEVEL]);

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