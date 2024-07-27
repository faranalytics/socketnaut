import * as net from 'node:net';
import * as tls from 'node:tls';
import * as events from 'node:events';
import * as threads from 'node:worker_threads';
import { WorkerAgent } from './worker_agent.js';
import { ConsoleHandler, Metadata, Level, LevelLogger, MetadataFormatter } from 'memoir';
import { ProxySocketAddressInfo } from './types.js';

export interface ServiceProxyOptions {
    server: net.Server;
    workerCount?: number;
    workerURL: string | URL;
    minWorkers?: number;
    maxWorkers?: number;
    workersCheckingInterval?: number;
    workerOptions?: threads.WorkerOptions;
}

export class ServiceProxy {

    public server: net.Server;
    public workerCount?: number;
    public workerURL: string | URL;
    public minWorkers: number;
    public maxWorkers?: number;
    public workersCheckingInterval?: number;
    public workersCheckingIntervalTimeout?: NodeJS.Timeout;
    public workerOptions?: threads.WorkerOptions;
    public agents: Array<WorkerAgent>;
    public log: LevelLogger<string, string>;
    public logHandler: ConsoleHandler<string, string>;
    public proxySocketAddressInfo: Map<string, ProxySocketAddressInfo>;
    public proxyAddressInfoRepr?: string;
    public proxyAddressInfo?: net.AddressInfo | string | null;
    public emitter: events.EventEmitter;

    constructor({
        server,
        workerCount,
        workerURL,
        minWorkers = 0,
        maxWorkers,
        workersCheckingInterval,
        workerOptions
    }: ServiceProxyOptions) {
        this.server = server;
        this.workerCount = workerCount;
        this.workerURL = workerURL;
        this.minWorkers = workerCount ?? minWorkers;
        this.maxWorkers = workerCount ?? maxWorkers;
        this.workersCheckingInterval = workersCheckingInterval;
        this.workerOptions = workerOptions;
        this.agents = [];
        this.proxySocketAddressInfo = new Map<string, ProxySocketAddressInfo>();
        this.emitter = new events.EventEmitter();

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const formatter = (message: string, { name, level, func, url, line, col }: Metadata): string =>
            `${level}:${new Date().toISOString()}:${name}:${func}:${line}:${col}:${message}`;

        this.log = new LevelLogger<string, string>({ name: `Proxy ${threads.threadId}`, level: Level.INFO });
        this.logHandler = new ConsoleHandler<string, string>();
        this.logHandler.setLevel(Level.DEBUG);
        const metadataFormatter = new MetadataFormatter<string, string>({ formatter });
        this.logHandler.setFormatter(metadataFormatter);
        this.log.addHandler(this.logHandler);

        if (this.server instanceof tls.Server) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.server.on('secureConnection', this.tryAllocateThread.bind(this));
        }
        else if (this.server instanceof net.Server) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.server.on('connection', this.tryAllocateThread.bind(this));
        }
        else {
            this.log.error?.(`The Service Proxy Server must be of type net.Server or tls.Server.`);
        }

        this.server.on('listening', () => {
            this.proxyAddressInfo = this.server?.address();
            this.proxyAddressInfoRepr = JSON.stringify(this.proxyAddressInfo);
            this.log.info?.(`Service Proxy listening on ${this.proxyAddressInfoRepr}`);
        });

        void this.spawnMinWorkers();

        if (this.workersCheckingInterval) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.workersCheckingIntervalTimeout = setTimeout(this.checkThreads.bind(this), this.workersCheckingInterval);
        }
    }

    protected async tryAllocateThread(clientProxySocket: net.Socket): Promise<void> {

        clientProxySocket.pause();

        clientProxySocket.on('error', (err: Error) => {
            this.log.error?.(`Client-Proxy socket error.  ${this.describeError(err)}.`);
        });

        if (clientProxySocket.closed) {
            const tuple = `${clientProxySocket.remoteAddress}:${clientProxySocket.remotePort}, ${clientProxySocket.localAddress}:${clientProxySocket.localPort}, ${clientProxySocket.localFamily}`;
            this.log.debug?.(`The Client-Proxy socket ${tuple} closed prior to proxying the connection. Proxy: ${this.proxyAddressInfoRepr}.`);
            return;
        }

        let agent = this.agents[0];

        try {
            if (agent?.socketConnectOpts && agent.connections === 0) {
                // The Agent has socketConnectOpts; hence, it is ready.
                agent.connections = agent.connections + 1;
                this.reorderAgent(agent);
            }
            else if (agent && this.agents.length === this.maxWorkers) {
                // The Agents pool is full; hence, use the Agent with the least number of connections i.e., the one at index 0.
                agent.connections = agent.connections + 1;
                this.reorderAgent(agent);
                if (!agent.socketConnectOpts) {
                    await agent.socketConnectOptsReady;
                }
            }
            else {
                agent = this.spawnWorker();
                agent.connections = agent.connections + 1;
                this.reorderAgent(agent);
                await agent.socketConnectOptsReady;
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            clientProxySocket.once('close', (hadError: boolean) => {
                agent.connections = agent.connections - 1;
                this.reorderAgent(agent);
            });

            try {
                await this.createServerConnection(clientProxySocket, agent.socketConnectOpts as net.SocketConnectOpts);
            }
            catch (err) {
                clientProxySocket.destroy();
                this.log.error?.(this.describeError(err));
            }
        }
        catch (err) {
            try {
                clientProxySocket.destroy();
                if (agent) {
                    this.removeAgent(agent);
                    await agent.call('tryTerminate');
                }
            }
            catch (err) {
                this.log.error?.(this.describeError(err));
            }
            this.log.error?.(this.describeError(err));
        }
    }

    protected async createServerConnection(clientProxySocket: net.Socket, socketConnectOpts: net.SocketConnectOpts): Promise<void> {

        const message = `Connect options: ${JSON.stringify(socketConnectOpts)}`;

        const proxyServerSocket = net.createConnection(socketConnectOpts);

        return new Promise((r, j) => {

            proxyServerSocket.once('error', j);

            proxyServerSocket.on('connect', () => {

                proxyServerSocket.on('error', (err: Error) => {
                    this.log.error?.(`Proxy-Server socket error.  ${this.describeError(err)}  ${message}.`);
                });

                const proxyServerSocketAddressInfo = proxyServerSocket.address();
                const proxyServerSocketAddressInfoRepr = JSON.stringify(proxyServerSocketAddressInfo, Object.keys(proxyServerSocketAddressInfo).sort());
                this.proxySocketAddressInfo.set(proxyServerSocketAddressInfoRepr, {
                    local: {
                        address: clientProxySocket.localAddress ?? '',
                        family: clientProxySocket.localFamily ?? '',
                        port: clientProxySocket.localPort ?? NaN
                    },
                    remote: {
                        address: clientProxySocket.remoteAddress ?? '',
                        family: clientProxySocket.remoteFamily ?? '',
                        port: clientProxySocket.remotePort ?? NaN
                    }
                });

                proxyServerSocket.on('timeout', () => {
                    this.log.debug?.(`Proxy-Server socket timeout. ${message}.`);
                });

                clientProxySocket.on('timeout', () => {
                    this.log.debug?.(`Client-Proxy socket timeout. ${message}.`);
                });

                proxyServerSocket.once('end', () => {
                    this.log.debug?.(`Proxy-Server socket end. ${message}.`);
                    clientProxySocket.end();
                });

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                proxyServerSocket.once('close', (hadError: boolean) => {
                    this.log.debug?.(`Proxy-Server socket close. ${message}.`);
                    clientProxySocket.destroy();
                    this.proxySocketAddressInfo.delete(proxyServerSocketAddressInfoRepr);
                });

                clientProxySocket.once('end', () => {
                    this.log.debug?.(`Client-Proxy socket end.  ${message}.`);
                    proxyServerSocket.end();
                });

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                clientProxySocket.once('close', (hadError: boolean) => {
                    this.log.debug?.(`Client-Proxy socket close. ${message}.`);
                    proxyServerSocket.destroy();
                });

                clientProxySocket.pipe(proxyServerSocket);
                proxyServerSocket.pipe(clientProxySocket);

                proxyServerSocket.removeListener('error', j);

                r();
            });
        });
    }

    protected async checkThreads(): Promise<void> {
        try {
            this.log.debug?.(`Thread Count: ${this.agents.length}`);

            if (this.agents.length > this.minWorkers) {
                for (const agent of [...this.agents]) {
                    if (agent.socketConnectOpts && agent.connections === 0) {
                        try {
                            this.removeAgent(agent);
                            await agent.call('tryTerminate');
                        }
                        catch (err) {
                            this.log.error?.(this.describeError(err));
                        }

                        if (this.agents.length <= this.minWorkers) {
                            break;
                        }
                    }
                }
            }
        }
        finally {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            this.workersCheckingIntervalTimeout = setTimeout(this.checkThreads.bind(this), this.workersCheckingInterval);
        }
    }

    protected removeAgent(agent: WorkerAgent): void {
        const index = this.agents.indexOf(agent);
        if (index != -1) {
            this.agents.splice(index, 1);
        }
    }

    protected reorderAgent(agent: WorkerAgent): void {

        const index = this.agents.indexOf(agent);

        if (index != -1) {
            this.agents.splice(index, 1);
        }

        for (let i = 0; i < this.agents.length; i = i + 1) {
            if (agent.connections < this.agents[i].connections) {
                this.agents.splice(i, 0, agent);
                return;
            }
        }

        this.agents.push(agent);
    }

    protected async spawnMinWorkers(): Promise<void> {
        try {
            while (this.agents.length < this.minWorkers) {
                const agent = this.spawnWorker();
                this.reorderAgent(agent);
                await agent.socketConnectOptsReady;
            }
        }
        catch (err) {
            this.describeError(err);
        }
        finally {
            this.emitter.emit('ready', ...this.agents);
        }
    }

    protected spawnWorker(): WorkerAgent {
        const worker = new threads.Worker(this.workerURL, this.workerOptions);
        const agent = new WorkerAgent({ worker });
        worker.once('error', (err: Error) => {
            this.log.error?.(this.describeError(err));
            this.removeAgent(agent);
        });
        worker.once('exit', this.removeAgent.bind(this, agent));
        agent.register('serviceLog', this.serviceLog.bind(this));
        agent.register('requestProxyAddressInfo', this.requestProxySocketAddressInfo.bind(this));
        return agent;
    }

    protected serviceLog(message: { level: string, value: string }): void {
        switch (message.level) {
            case 'DEBUG':
                this.log.debug?.(message.value);
                break;
            case 'INFO':
                this.log.info?.(message.value);
                break;
            case 'WARN':
                this.log.warn?.(message.value);
                break;
            case 'ERROR':
                this.log.error?.(message.value);
                break;
        }
    }

    protected requestProxySocketAddressInfo(proxyServerAddressInfo: string): ProxySocketAddressInfo | undefined {
        const proxySocketAddressInfo = this.proxySocketAddressInfo.get(proxyServerAddressInfo);
        return proxySocketAddressInfo;
    }

    protected describeError(err: unknown): string {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }

    public async shutdown(): Promise<Array<PromiseSettledResult<unknown>>> {
        await new Promise((r, e) => {
            this.server.close((err) => err ? e(err) : r(true));
        });
        if (this.server instanceof tls.Server) {
            this.server.removeAllListeners('secureConnection');
        }
        else if (this.server instanceof net.Server) {
            this.server.removeAllListeners('connection');
        }
        clearTimeout(this.workersCheckingIntervalTimeout);
        this.minWorkers = 0;
        const exits = this.agents.map((agent: WorkerAgent) => {
            const promise = new Promise((r, j) => {
                agent.worker.on('exit', r);
                agent.worker.on('error', j);
            });
            agent.call('tryTerminate').catch(() => { });
            return promise;
        });
        return Promise.allSettled(exits);
    }
}

export function createServiceProxy(options: ServiceProxyOptions): ServiceProxy {
    return new ServiceProxy(options);
}