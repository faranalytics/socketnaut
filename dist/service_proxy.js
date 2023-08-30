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
const net = __importStar(require("node:net"));
const threads = __importStar(require("node:worker_threads"));
const worker_agent_js_1 = require("./worker_agent.js");
const logging_js_1 = require("./logging.js");
class ServiceProxy {
    server;
    workerURL;
    minWorkers;
    maxWorkers;
    workersCheckingInterval;
    workerOptions;
    agents;
    constructor({ server = net.createServer(), workerURL, minWorkers = 0, maxWorkers, workersCheckingInterval = 60000, workerOptions }) {
        this.server = server;
        this.workerURL = workerURL;
        this.minWorkers = minWorkers;
        this.maxWorkers = maxWorkers;
        this.workersCheckingInterval = workersCheckingInterval;
        this.workerOptions = workerOptions;
        this.agents = [];
        this.server.on('connection', this.handleClientSocket.bind(this));
        void this.spawnMinWorkers();
    }
    handleClientSocket(clientProxySocket) {
        try {
            clientProxySocket.on('error', (err) => {
                logging_js_1.log.error(`Client socket error.  ${this.describeError(err)}.`);
            });
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            setImmediate(this.tryAllocateThread.bind(this, clientProxySocket));
        }
        catch (err) {
            logging_js_1.log.error(this.describeError(err));
            clientProxySocket.destroy();
        }
    }
    async tryAllocateThread(clientProxySocket) {
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
                    await this.createServerConnection(clientProxySocket, agent.socketConnectOpts);
                }
                else {
                    agent = this.spawnWorker();
                    agent.connections = agent.connections + 1;
                    this.reorderAgent(agent);
                    await agent.online;
                    await this.createServerConnection(clientProxySocket, agent.socketConnectOpts);
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
            logging_js_1.log.error(this.describeError(err));
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            setImmediate(this.tryAllocateThread.bind(this, clientProxySocket));
        }
    }
    async createServerConnection(clientProxySocket, socketConnectOpts) {
        const message = `Proxy Server Connect Options: ${JSON.stringify(socketConnectOpts)}.`;
        const proxyServerSocket = net.createConnection(socketConnectOpts);
        return new Promise((r, j) => {
            proxyServerSocket.on('error', j);
            proxyServerSocket.on('connect', () => {
                proxyServerSocket.removeListener('error', j);
                proxyServerSocket.on('error', (err) => {
                    logging_js_1.log.error(`Server socket error.  ${this.describeError(err)}  ${message}.`);
                });
                proxyServerSocket.on('timeout', () => {
                    logging_js_1.log.debug(`Server timeout. ${message}.`);
                });
                clientProxySocket.on('timeout', () => {
                    logging_js_1.log.debug(`Client timeout. ${message}.`);
                });
                proxyServerSocket.once('end', () => {
                    logging_js_1.log.debug(`Server socket end. ${message}.`);
                    clientProxySocket.end();
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                proxyServerSocket.once('close', (hadError) => {
                    logging_js_1.log.debug(`Server socket close. ${message}.`);
                    clientProxySocket.destroy();
                });
                clientProxySocket.once('end', () => {
                    logging_js_1.log.debug(`Client socket end.  ${message}.`);
                    proxyServerSocket.end();
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                clientProxySocket.once('close', (hadError) => {
                    logging_js_1.log.debug(`Client socket close. ${message}.`);
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
            logging_js_1.log.debug(`Thread Count: ${this.agents.length}`);
            if (this.agents.length > this.minWorkers) {
                for (const agent of [...this.agents]) {
                    if (agent.socketConnectOpts && agent.connections === 0) {
                        try {
                            this.removeAgent(agent);
                            await agent.call('tryTerminate');
                        }
                        catch (err) {
                            logging_js_1.log.error(this.describeError(err));
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
        void (async () => {
            try {
                await this.spawnMinWorkers();
            }
            catch (err) {
                this.describeError(err);
            }
        })();
    }
    reorderAgent(agent) {
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
        agent.register('serviceLog', this.serviceLog.bind(this));
        worker.once('error', this.removeAgent.bind(this, agent));
        worker.once('exit', this.removeAgent.bind(this, agent));
        return agent;
    }
    serviceLog(message) {
        switch (message.level) {
            case 'DEBUG':
                logging_js_1.log.debug(message.value);
                break;
            case 'INFO':
                logging_js_1.log.info(message.value);
                break;
            case 'WARN':
                logging_js_1.log.warn(message.value);
                break;
            case 'ERROR':
                logging_js_1.log.error(message.value);
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