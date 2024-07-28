/* eslint-disable @typescript-eslint/no-unused-vars */
import { once } from 'node:events';
import { Server } from 'node:http';
import * as net from 'node:net';
import { Level, WorkerAgent, createServiceProxy } from 'socketnaut';

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
    workerCount: 100,
    workerURL: new URL('./https_service.js', import.meta.url)
});
// proxy3443.log.setLevel(Level.ERROR);
proxy3443.server.listen({ port: 3443, host: '127.0.0.1' });

const timeout = setInterval(() => {
    proxy3443.agents[0].connections;
    proxy3443.log.info?.(`Status: ${proxy3443.agents.length}, ${proxy3443.maxWorkers}, ${proxy3443.minWorkers}.`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    console.log(JSON.stringify(proxy3443.agents.map<number>((value: WorkerAgent) => value.connections)));
}, 500);

// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('message', async function onMessage(message: { event: string }) {
    if (message.event === 'shutdown') {
        clearInterval(timeout);
        await proxy3080.shutdown().catch(console.error);
        await proxy3443.shutdown().catch(console.error);
        console.log(JSON.stringify(proxy3080.agents.map<number>((value: WorkerAgent) => value.connections)));
        console.log(JSON.stringify(proxy3443.agents.map<number>((value: WorkerAgent) => value.connections)));
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        process.removeListener('message', onMessage);
    }
});

const test = await once(proxy3443, 'ready');

process.send?.('ready');