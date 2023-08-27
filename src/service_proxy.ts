import * as net from 'node:net';
import * as threads from 'node:worker_threads';
import { WorkerAgent } from './worker_agent.js';
import { log } from './logging.js';

export interface ServiceProxyOptions {
    server: net.Server;
    workerURL: string | URL;
    minServers: number;
    maxServers?: number;
    servicesCheckingInterval?: number;
    workerOptions?: threads.WorkerOptions;
}

export class ServiceProxy {

    public server: net.Server;
    public workerURL: string | URL;
    public minServers: number;
    public maxServers?: number;
    public servicesCheckingInterval?: number;
    public workerOptions?: threads.WorkerOptions;
    public agents: Array<WorkerAgent>;

    constructor({
        server = net.createServer(),
        workerURL,
        minServers = 0,
        maxServers,
        servicesCheckingInterval = 30000,
        workerOptions
    }: ServiceProxyOptions) {

        this.server = server;
        this.workerURL = workerURL;
        this.minServers = minServers;
        this.maxServers = maxServers;
        this.servicesCheckingInterval = servicesCheckingInterval;
        this.workerOptions = workerOptions;

        this.agents = [];

        this.server.on('connection', this.handleClientSocket.bind(this));

        void this.spawnMinWorkers();
    }

    protected async handleClientSocket(clientProxySocket: net.Socket): Promise<void> {

        try {

            clientProxySocket.on('error', (err: Error) => {
                log.error(`Client socket error.  ${this.describeError(err)}.`);
            });

            setImmediate(this.tryAllocateThread.bind(this, clientProxySocket));
        }
        catch (err) {
            log.error(this.describeError(err));
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
                else if (this.agents.length === this.maxServers) {
                    agent.connections = agent.connections + 1;
                    this.reorderAgent(agent);
                    await agent.online;
                    await this.createServerConnection(clientProxySocket, agent.socketConnectOpts as net.SocketConnectOpts);
                }
                else {
                    const agent = await this.spawnWorker();
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
            log.error(this.describeError(err));
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
                    log.error(`Server socket error.  ${this.describeError(err)}  ${message}.`);
                });

                proxyServerSocket.on('timeout', () => {
                    log.debug(`Server timeout. ${message}.`);
                });

                clientProxySocket.on('timeout', () => {
                    log.debug(`Client timeout. ${message}.`);
                });

                proxyServerSocket.once('end', () => {
                    log.debug(`Server socket end. ${message}.`);
                    clientProxySocket.end();
                });

                proxyServerSocket.once('close', (hadError: boolean) => {
                    log.debug(`Server socket close. ${message}.`);
                    clientProxySocket.destroy();
                });

                clientProxySocket.once('end', () => {
                    log.debug(`Client socket end.  ${message}.`);
                    proxyServerSocket.end();
                });

                clientProxySocket.once('close', (hadError: boolean) => {
                    log.debug(`Client socket close. ${message}.`);
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
            log.debug(`Thread Count: ${this.agents.length}`);

            if (this.agents.length > this.minServers) {
                for (const agent of [...this.agents]) {
                    if (agent.socketConnectOpts && agent.connections === 0) {
                        try {
                            this.removeAgent(agent);
                            await agent.call('tryTerminate');
                        }
                        catch (err) {
                            log.error(this.describeError(err));
                        }

                        if (this.agents.length <= this.minServers) {
                            break;
                        }
                    }
                }
            }
        }
        finally {
            setTimeout(this.checkThreads.bind(this), this.servicesCheckingInterval);
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
            while (this.agents.length < this.minServers) {
                const agent = await this.spawnWorker();
                this.agents.push(agent);
                await agent.online;
                this.reorderAgent(agent);
            }
        }
        catch (err) {
            this.describeError(err);
        }
    }

    protected async spawnWorker(): Promise<WorkerAgent> {
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
                log.debug(message.value);
                break;
            case 'INFO':
                log.info(message.value);
                break;
            case 'WARN':
                log.warn(message.value);
                break;
            case 'ERROR':
                log.error(message.value);
                break;
        }
    }

    protected describeError(err: unknown) {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }
}