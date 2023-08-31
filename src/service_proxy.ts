/* eslint-disable @typescript-eslint/no-unused-vars */
import * as net from 'node:net';
import * as threads from 'node:worker_threads';
import { WorkerAgent } from './worker_agent.js';
import { ConsoleHandler, IMeta, Level, LevelLogger, MetaFormatter } from 'memoir';

export interface ServiceProxyOptions {
    server: net.Server;
    workerURL: string | URL;
    minWorkers: number;
    maxWorkers?: number;
    workersCheckingInterval?: number;
    workerOptions?: threads.WorkerOptions;
}

export class ServiceProxy {

    public server: net.Server;
    public workerURL: string | URL;
    public minWorkers: number;
    public maxWorkers?: number;
    public workersCheckingInterval?: number;
    public workerOptions?: threads.WorkerOptions;
    protected agents: Array<WorkerAgent>;
    public log: LevelLogger<string, string>;
    public logHandler: ConsoleHandler<string, string>;
    public logFormatter: MetaFormatter<string, string>;

    constructor({
        server = net.createServer(),
        workerURL,
        minWorkers = 0,
        maxWorkers,
        workersCheckingInterval = 60000,
        workerOptions
    }: ServiceProxyOptions) {

        this.server = server;
        this.workerURL = workerURL;
        this.minWorkers = minWorkers;
        this.maxWorkers = maxWorkers;
        this.workersCheckingInterval = workersCheckingInterval;
        this.workerOptions = workerOptions;
        this.agents = [];

        const levelLogger = this.log = new LevelLogger<string, string>({ name: `Proxy ${threads.threadId}.` });
        const consoleHandler = this.logHandler = new ConsoleHandler<string, string>();
        consoleHandler.setLevel(Level['INFO']);
        const metaFormatter = this.logFormatter = new MetaFormatter<string, string>(
            (message: string, { name, level, func, url, line, col }: IMeta): string =>
                `${Level[level]}:${new Date().toISOString()}:${name}:${func}:${line}:${col}:${message}`
        );
        consoleHandler.setFormatter(metaFormatter);
        levelLogger.addHandler(consoleHandler);

        this.server.on('connection', this.handleClientSocket.bind(this));
        this.server.on('listening', () => this.log.info(`Service Proxy listening on ${JSON.stringify(this.server?.address())}`));

        void this.spawnMinWorkers();
    }

    protected handleClientSocket(clientProxySocket: net.Socket): void {

        try {

            clientProxySocket.on('error', (err: Error) => {
                this.log.error(`Client socket error.  ${this.describeError(err)}.`);
            });

            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            setImmediate(this.tryAllocateThread.bind(this, clientProxySocket));
        }
        catch (err) {
            this.log.error(this.describeError(err));
            clientProxySocket.destroy();
        }
    }

    protected async tryAllocateThread(clientProxySocket: net.Socket): Promise<void> {

        try {

            if (clientProxySocket.closed) {
                clientProxySocket.destroy();
                return;
            }

            let agent = this.agents[0];

            try {
                if (agent.socketConnectOpts && agent.connections === 0) {
                    agent.connections = agent.connections + 1;
                    this.reorderAgent(agent);
                    await this.createServerConnection(clientProxySocket, agent.socketConnectOpts);
                }
                else if (this.agents.length === this.maxWorkers) {
                    agent.connections = agent.connections + 1;
                    this.reorderAgent(agent);
                    await agent.online;
                    await this.createServerConnection(clientProxySocket, agent.socketConnectOpts as net.SocketConnectOpts);
                }
                else {
                    agent = this.spawnWorker();
                    agent.connections = agent.connections + 1;
                    this.reorderAgent(agent);
                    await agent.online;
                    await this.createServerConnection(clientProxySocket, agent.socketConnectOpts as net.SocketConnectOpts);
                }
            }
            catch (err) {
                agent.connections = agent.connections - 1;
                this.reorderAgent(agent);
                throw (err);
            }

            clientProxySocket.once('close', () => {
                agent.connections = agent.connections - 1;
                this.reorderAgent(agent);
            });
        }
        catch (err) {
            this.log.error(this.describeError(err));
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            setImmediate(this.tryAllocateThread.bind(this, clientProxySocket));
        }
    }

    protected async createServerConnection(clientProxySocket: net.Socket, socketConnectOpts: net.SocketConnectOpts): Promise<void> {

        const message = `Proxy Server Connect Options: ${JSON.stringify(socketConnectOpts)}.`;

        const proxyServerSocket = net.createConnection(socketConnectOpts);

        return new Promise((r, j) => {

            proxyServerSocket.on('error', j);

            proxyServerSocket.on('connect', () => {

                proxyServerSocket.removeListener('error', j);

                proxyServerSocket.on('error', (err: Error) => {
                    this.log.error(`Server socket error.  ${this.describeError(err)}  ${message}.`);
                });

                proxyServerSocket.on('timeout', () => {
                    this.log.debug(`Server timeout. ${message}.`);
                });

                clientProxySocket.on('timeout', () => {
                    this.log.debug(`Client timeout. ${message}.`);
                });

                proxyServerSocket.once('end', () => {
                    this.log.debug(`Server socket end. ${message}.`);
                    clientProxySocket.end();
                });

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                proxyServerSocket.once('close', (hadError: boolean) => {
                    this.log.debug(`Server socket close. ${message}.`);
                    clientProxySocket.destroy();
                });

                clientProxySocket.once('end', () => {
                    this.log.debug(`Client socket end.  ${message}.`);
                    proxyServerSocket.end();
                });

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                clientProxySocket.once('close', (hadError: boolean) => {
                    this.log.debug(`Client socket close. ${message}.`);
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
            this.log.debug(`Thread Count: ${this.agents.length}`);

            if (this.agents.length > this.minWorkers) {
                for (const agent of [...this.agents]) {
                    if (agent.socketConnectOpts && agent.connections === 0) {
                        try {
                            this.removeAgent(agent);
                            await agent.call('tryTerminate');
                        }
                        catch (err) {
                            this.log.error(this.describeError(err));
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

    protected removeAgent(agent: WorkerAgent) {
        const index = this.agents.indexOf(agent);
        if (index != -1) {
            this.agents.splice(index, 1);
        }

        void (async () => {
            try {
                await this.spawnMinWorkers();
            }
            catch (err) {
                this.describeError(err);
            }
        })();
    }

    protected reorderAgent(agent: WorkerAgent) {

        const index = this.agents.indexOf(agent);

        if (index != -1) {
            this.agents.splice(index, 1);
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
        agent.register('serviceLog', this.serviceLog.bind(this));
        worker.once('error', this.removeAgent.bind(this, agent));
        worker.once('exit', this.removeAgent.bind(this, agent));
        return agent;
    }

    protected serviceLog(message: { level: string, value: string }) {
        switch (message.level) {
            case 'DEBUG':
                this.log.debug(message.value);
                break;
            case 'INFO':
                this.log.info(message.value);
                break;
            case 'WARN':
                this.log.warn(message.value);
                break;
            case 'ERROR':
                this.log.error(message.value);
                break;
        }
    }

    protected describeError(err: unknown) {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }
}

export function createServiceProxy(options: ServiceProxyOptions): ServiceProxy {
    return new ServiceProxy(options);
}
