import * as net from 'node:net';
import * as tls from 'node:tls';
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
    public workerOptions?: threads.WorkerOptions;
    public agents: Array<WorkerAgent>;
    public log: LevelLogger<string, string>;
    public logHandler: ConsoleHandler<string, string>;
    public proxySocketAddressInfo: Map<string, ProxySocketAddressInfo>;
    public proxyAddressInfoRepr?: string;
    public proxyAddressInfo?: net.AddressInfo | string | null;

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
            this.log.error?.(`The Service Proxy Server must be of type tls.Server or net.Server.`);
        }

        this.server.on('listening', () => {
            this.proxyAddressInfo = this.server?.address();
            this.proxyAddressInfoRepr = JSON.stringify(this.proxyAddressInfo);
            this.log.info?.(`Service Proxy listening on ${this.proxyAddressInfoRepr}`);
        });

        void this.spawnMinWorkers();

        if (this.workersCheckingInterval) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            setTimeout(this.checkThreads.bind(this), this.workersCheckingInterval);
        }
    }

    protected async tryAllocateThread(clientProxySocket: net.Socket): Promise<void> {

        if (clientProxySocket.closed) {
            const tuple = `${clientProxySocket.remoteAddress}:${clientProxySocket.remotePort}, ${clientProxySocket.localAddress}:${clientProxySocket.localPort}, ${clientProxySocket.localFamily}`;
            this.log.debug?.(`The client-proxy socket ${tuple} closed prior to proxying the connection. Proxy: ${this.proxyAddressInfoRepr}.`);
            return;
        }

        clientProxySocket.on('error', (err: Error) => {
            this.log.error?.(`Client socket error.  ${this.describeError(err)}.`);
        });

        let agent = this.agents[0];

        try {
            if (agent && agent.socketConnectOpts && agent.connections === 0) {
                agent.connections = agent.connections + 1;
                this.reorderAgent(agent);
            }
            else if (agent && this.agents.length === this.maxWorkers) {
                agent.connections = agent.connections + 1;
                this.reorderAgent(agent);
                if (!agent.socketConnectOpts) {
                    await agent.online;
                }
            }
            else {
                agent = this.spawnWorker();
                agent.connections = agent.connections + 1;
                this.agents.push(agent);
                this.reorderAgent(agent);
                await agent.online;
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

        const message = `Proxy Server Connect Options: ${JSON.stringify(socketConnectOpts)}`;

        const proxyServerSocket = net.createConnection(socketConnectOpts);

        return new Promise((r, j) => {

            proxyServerSocket.once('error', j);

            proxyServerSocket.on('connect', () => {

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

                proxyServerSocket.removeListener('error', j);

                proxyServerSocket.on('error', (err: Error) => {
                    this.log.error?.(`Server socket error.  ${this.describeError(err)}  ${message}.`);
                });

                proxyServerSocket.on('timeout', () => {
                    this.log.debug?.(`Server timeout. ${message}.`);
                });

                clientProxySocket.on('timeout', () => {
                    this.log.debug?.(`Client timeout. ${message}.`);
                });

                proxyServerSocket.once('end', () => {
                    this.log.debug?.(`Server socket end. ${message}.`);
                    clientProxySocket.end();
                });

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                proxyServerSocket.once('close', (hadError: boolean) => {
                    this.log.debug?.(`Server socket close. ${message}.`);
                    clientProxySocket.destroy();
                    this.proxySocketAddressInfo.delete(proxyServerSocketAddressInfoRepr);
                });

                clientProxySocket.once('end', () => {
                    this.log.debug?.(`Client socket end.  ${message}.`);
                    proxyServerSocket.end();
                });

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                clientProxySocket.once('close', (hadError: boolean) => {
                    this.log.debug?.(`Client socket close. ${message}.`);
                    proxyServerSocket.destroy();
                });

                clientProxySocket.on('data', (data) => {
                    proxyServerSocket.write(data);
                });

                proxyServerSocket.on('data', (data) => {
                    clientProxySocket.write(data);
                });

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
            setTimeout(this.checkThreads.bind(this), this.workersCheckingInterval);
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
        else {
            return;  // The agent isn't in the list; hence, there is nothing to reorder.
        }

        for (let i = 0; i < this.agents.length; i = i + 1) {
            if (agent.connections <= this.agents[i].connections) {
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
                this.agents.push(agent);
                await agent.online;
                this.reorderAgent(agent);
            }
        }
        catch (err) {
            this.describeError(err);
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

    protected describeError(err: unknown) {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }
}

export function createServiceProxy(options: ServiceProxyOptions): ServiceProxy {
    return new ServiceProxy(options);
}
