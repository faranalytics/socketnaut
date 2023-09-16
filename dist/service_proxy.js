"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServiceProxy = exports.ServiceProxy = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const net = __importStar(require("node:net"));
const threads = __importStar(require("node:worker_threads"));
const worker_agent_js_1 = require("./worker_agent.js");
const memoir_1 = require("memoir");
class ServiceProxy {
    server;
    workerURL;
    minWorkers;
    maxWorkers;
    workersCheckingInterval;
    workerOptions;
    agents;
    log;
    logHandler;
    constructor({ server = net.createServer(), workerURL, minWorkers = 0, maxWorkers, workersCheckingInterval = 60000, workerOptions }) {
        this.server = server;
        this.workerURL = workerURL;
        this.minWorkers = minWorkers;
        this.maxWorkers = maxWorkers;
        this.workersCheckingInterval = workersCheckingInterval;
        this.workerOptions = workerOptions;
        this.agents = [];
        const formatter = (message, { name, level, func, url, line, col }) => `${level}:${new Date().toISOString()}:${name}:${func}:${line}:${col}:${message}`;
        this.log = new memoir_1.LevelLogger({ name: `Proxy ${threads.threadId}`, level: memoir_1.Level.INFO });
        this.logHandler = new memoir_1.ConsoleHandler();
        this.logHandler.setLevel(memoir_1.Level.DEBUG);
        const metadataFormatter = new memoir_1.MetadataFormatter({ formatter });
        this.logHandler.setFormatter(metadataFormatter);
        this.log.addHandler(this.logHandler);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.server.on('connection', this.tryAllocateThread.bind(this));
        this.server.on('listening', () => this.log.info?.(`Service Proxy listening on ${JSON.stringify(this.server?.address())}`));
        void this.spawnMinWorkers();
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(this.checkThreads.bind(this), this.workersCheckingInterval);
    }
    async tryAllocateThread(clientProxySocket) {
        clientProxySocket.on('error', (err) => {
            this.log.error?.(`Client socket error.  ${this.describeError(err)}.`);
        });
        let agent = this.agents[0];
        try {
            if (agent.socketConnectOpts && agent.connections === 0) {
                agent.connections = agent.connections + 1;
                this.reorderAgent(agent);
            }
            else if (this.agents.length === this.maxWorkers) {
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
            clientProxySocket.once('close', (hadError) => {
                agent.connections = agent.connections - 1;
                this.reorderAgent(agent);
            });
            try {
                await this.createServerConnection(clientProxySocket, agent.socketConnectOpts);
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
    async createServerConnection(clientProxySocket, socketConnectOpts) {
        const message = `Proxy Server Connect Options: ${JSON.stringify(socketConnectOpts)}.`;
        const proxyServerSocket = net.createConnection(socketConnectOpts);
        return new Promise((r, j) => {
            proxyServerSocket.once('error', j);
            proxyServerSocket.on('connect', () => {
                proxyServerSocket.removeListener('error', j);
                proxyServerSocket.on('error', (err) => {
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
                proxyServerSocket.once('close', (hadError) => {
                    this.log.debug?.(`Server socket close. ${message}.`);
                    clientProxySocket.destroy();
                });
                clientProxySocket.once('end', () => {
                    this.log.debug?.(`Client socket end.  ${message}.`);
                    proxyServerSocket.end();
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                clientProxySocket.once('close', (hadError) => {
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
    async checkThreads() {
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
    removeAgent(agent) {
        const index = this.agents.indexOf(agent);
        if (index != -1) {
            this.agents.splice(index, 1);
        }
    }
    reorderAgent(agent) {
        const index = this.agents.indexOf(agent);
        if (index != -1) {
            this.agents.splice(index, 1);
        }
        else {
            return; // The agent isn't in the list; hence, there is nothing to reorder.
        }
        for (let i = 0; i < this.agents.length; i = i + 1) {
            if (agent.connections <= this.agents[i].connections) {
                this.agents.splice(i, 0, agent);
                return;
            }
        }
        this.agents.push(agent);
    }
    async spawnMinWorkers() {
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
    spawnWorker() {
        const worker = new threads.Worker(this.workerURL, this.workerOptions);
        const agent = new worker_agent_js_1.WorkerAgent({ worker });
        worker.once('error', (err) => {
            this.log.error?.(this.describeError(err));
            this.removeAgent(agent);
        });
        worker.once('exit', this.removeAgent.bind(this, agent));
        agent.register('serviceLog', this.serviceLog.bind(this));
        return agent;
    }
    serviceLog(message) {
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
    describeError(err) {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }
}
exports.ServiceProxy = ServiceProxy;
function createServiceProxy(options) {
    return new ServiceProxy(options);
}
exports.createServiceProxy = createServiceProxy;
