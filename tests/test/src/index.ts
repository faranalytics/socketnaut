/* eslint-disable @typescript-eslint/no-unused-vars */
import * as net from 'node:net';
import * as tls from 'node:tls';
import * as fs from 'fs';
import * as os from 'os';
import * as pth from 'path';
import { Level, createServiceProxy, WorkerAgent } from 'socketnaut';

const httpProxy = createServiceProxy({
    server: net.createServer(),
    workerCount: 2,
    workersCheckingInterval: 1e4,
    workerURL: new URL('./http_redirect_service.js', import.meta.url)
});

httpProxy.log.setLevel(Level.DEBUG);

httpProxy.server.listen({ port: 3080, host: '0.0.0.0' });

const tlsServer = tls.createServer({
    key: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/key.pem')),
    cert: fs.readFileSync(pth.resolve(os.homedir(), 'secrets/crt.pem'))
});

const tlsProxy = createServiceProxy({
    server: tlsServer,
    workerCount: 42,
    workerURL: new URL('./service.js', import.meta.url)
});

tlsProxy.log.setLevel(Level.DEBUG);

tlsProxy.server.listen({ port: 3443, host: '0.0.0.0' });

// void (async () => {
//     await tlsProxy.shutdown();
//     await httpProxy.shutdown();
// })();

// eslint-disable-next-line @typescript-eslint/no-misused-promises
// setTimeout(async () => {
//     console.log(await tlsProxy.shutdown());
//     console.log(await httpProxy.shutdown());
//     console.log('tlsProxy.agents.length', tlsProxy.agents.length);
//     console.log('httpProxy.agents.length', httpProxy.agents.length);
//     // setTimeout(() => {
//     //     console.log('tlsProxy.agents.length', tlsProxy.agents.length);
//     //     console.log('httpProxy.agents.length', httpProxy.agents.length);
//     // }, 3000);
// }, 6000);

// setInterval(() => {
//     tlsProxy.agents[0].connections;
//     tlsProxy.log.info?.(`Status: ${tlsProxy.agents.length}, ${tlsProxy.maxWorkers}, ${tlsProxy.minWorkers}.`);
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
//     console.log(JSON.stringify(tlsProxy.agents.map<number>((value: WorkerAgent) => value.connections)));
// }, 1000);