import * as net from 'node:net';
import { createService } from 'network-services';
import { createServiceProxy, ServiceProxy, SyslogLevel, WorkerAgent } from 'socketnaut';
import { once } from 'node:events';
import { SyslogLevelT } from 'streams-logger';
import { KeysUppercase } from 'streams-logger/dist/commons/types.js';

const arg: Record<string, string> = process.argv.slice(2).reduce((prev: Record<string, string>, curr: string) => ({ ...prev, ...Object.fromEntries([curr.trim().split('=')]) }), {});
const LEVEL = <KeysUppercase<SyslogLevelT>><unknown>arg['level'];

const httpServiceProxy = createServiceProxy({
    server: net.createServer(),
    workerCount: 2,
    workerURL: new URL('./http_service.js', import.meta.url)
});
httpServiceProxy.server.listen({ port: 3080, host: '127.0.0.1' });
httpServiceProxy.log.setLevel(SyslogLevel[LEVEL]);
await once(httpServiceProxy, 'ready');

const httpsServiceProxy = createServiceProxy({
    server: net.createServer(),
    minWorkers: 1e1,
    maxWorkers: 1e2,
    workersCheckingInterval: 1e2,
    workerURL: new URL('./https_service.js', import.meta.url),
    workerOptions: { argv: process.argv.slice(2) }
});
httpsServiceProxy.server.listen({ port: 3443, host: '127.0.0.1' });
httpsServiceProxy.log.setLevel(SyslogLevel[LEVEL]);
await once(httpsServiceProxy, 'ready');

setInterval(() => {
    httpServiceProxy.log.info(`proxy.agents.length: ${httpServiceProxy.agents.length}, proxy.maxWorkers: ${httpServiceProxy.maxWorkers}, proxy.minWorkers: ${httpServiceProxy.minWorkers}.`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    httpServiceProxy.log.info(`Connection Distribution: ${JSON.stringify(httpServiceProxy.agents.map<number>((value: WorkerAgent) => value.connections))}`);

    httpsServiceProxy.log.info(`proxy.agents.length: ${httpsServiceProxy.agents.length}, proxy.maxWorkers: ${httpsServiceProxy.maxWorkers}, proxy.minWorkers: ${httpsServiceProxy.minWorkers}.`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    httpsServiceProxy.log.info(`Connection Distribution: ${JSON.stringify(httpsServiceProxy.agents.map<number>((value: WorkerAgent) => value.connections))}`);
}, 1500).unref();


export class ProxyController {
    public httpServiceProxy: ServiceProxy;
    public httpsServiceProxy: ServiceProxy;

    constructor(httpServiceProxy: ServiceProxy, httpsServiceProxy: ServiceProxy) {
        this.httpServiceProxy = httpServiceProxy;
        this.httpsServiceProxy = httpsServiceProxy;
    }

    getListening() : boolean {
        return this.httpServiceProxy.server.listening && this.httpsServiceProxy.server.listening;
    }
}

const proxyController = new ProxyController(httpServiceProxy, httpsServiceProxy);

const server = net.createServer();
server.on('error', console.error);
server.on('connection', (socket: net.Socket) => {
    const service = createService(socket);
    service.createServiceApp(proxyController);
});
server.listen({ port: 3000, host: '127.0.0.1' });
await once(server, 'listening');
server.unref();

process.send?.('ready');