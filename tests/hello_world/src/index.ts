/* eslint-disable @typescript-eslint/no-unused-vars */
import * as net from 'node:net';
import { Level, createServiceProxy } from 'socketnaut';
import { WorkerAgent } from '../../../dist/worker_agent';

const proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 4,
    maxWorkers: 100,
    workersCheckingInterval: 1e6,
    workerURL: require.resolve('./http_server.js')
});

// proxy.logHandler.setLevel(Level['DEBUG']);

proxy.server.listen({ port: 3000, host: '0.0.0.0' });

setInterval(() => {
    proxy.log.info(`Thread count: ${proxy.agents.length}`);
    console.log(JSON.stringify(proxy.agents.map((value: WorkerAgent) => value.connections)));
    console.log(proxy.maxWorkers, proxy.minWorkers);
}, 1000);
