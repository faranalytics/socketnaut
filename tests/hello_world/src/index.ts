/* eslint-disable @typescript-eslint/no-unused-vars */
import * as net from 'node:net';
import { Level, createServiceProxy } from 'socketnaut';
import { WorkerAgent } from '../../../dist/worker_agent';

const proxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 500,
    maxWorkers: 500,
    workersCheckingInterval: 1e4,
    workerURL: require.resolve('./http_server.js')
});

proxy.logHandler.setLevel(Level.INFO);

proxy.server.listen({ port: 3000, host: '0.0.0.0' });

setInterval(() => {
    proxy.log.info(`Status: ${proxy.agents.length}, ${proxy.maxWorkers}, ${proxy.minWorkers}.`);
    console.log(JSON.stringify(proxy.agents.map((value: WorkerAgent) => value.connections)));
}, 1000);
