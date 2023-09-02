"use strict";
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
exports.createServiceAgent = exports.ServiceAgent = exports.ServiceMessageHandler = void 0;
const threads = __importStar(require("node:worker_threads"));
const port_agent_1 = require("port_agent");
const memoir_1 = require("memoir");
threads.parentPort?.unref();
class ServiceMessageHandler extends memoir_1.LevelHandler {
    formatter;
    agent;
    constructor(agent) {
        super();
        this.handle = this.handle.bind(this);
        this.setFormatter = this.setFormatter.bind(this);
        this.setLevel = this.setLevel.bind(this);
        this.agent = agent;
    }
    async handle(message, meta) {
        if (meta.level && meta.level >= this.level) {
            if (this.formatter) {
                const formattedMessage = this.formatter.format(message, meta);
                await this.agent.call('serviceLog', { level: memoir_1.Level[meta.level], value: formattedMessage });
            }
        }
    }
}
exports.ServiceMessageHandler = ServiceMessageHandler;
class ServiceAgent extends port_agent_1.Agent {
    server;
    addressInfo;
    agentDescription;
    log;
    logHandler;
    logFormatter;
    constructor(port, options) {
        super(port);
        this.agentDescription = `Thread: ${threads.threadId}`;
        this.register('tryTerminate', this.tryTerminate.bind(this));
        this.server = options.server;
        this.server.once('listening', this.postListeningMessage.bind(this));
        this.log = new memoir_1.LevelLogger({ name: `Agent ${threads.threadId}` });
        const messageHandler = this.logHandler = new ServiceMessageHandler(this);
        const formatter = this.logFormatter = new memoir_1.MetaFormatter((message, { name, level, func, url, line, col }) => `${func}:${line}:${col}:${message}`);
        messageHandler.setLevel(memoir_1.Level.INFO);
        messageHandler.setFormatter(formatter);
        this.log.addHandler(messageHandler);
    }
    tryTerminate() {
        try {
            if (this.server) {
                this.server.unref();
                this.log.debug(`Process exit. ${this.agentDescription}.`);
                setImmediate(() => {
                    process.exit(0);
                });
            }
        }
        catch (err) {
            this.log.error(this.describeError(err));
        }
        finally {
            setTimeout(this.tryTerminate.bind(this), 4).unref();
        }
    }
    postListeningMessage() {
        this.addressInfo = this.server?.address();
        let socketConnectOpts;
        if (typeof this.addressInfo == 'string') {
            socketConnectOpts = { path: this.addressInfo };
        }
        else if (this.addressInfo?.port) {
            socketConnectOpts = { port: this.addressInfo.port, host: this.addressInfo.address };
        }
        else {
            socketConnectOpts = null;
        }
        this.log.debug(`Server thread ${threads.threadId} is listening on ${JSON.stringify(this.addressInfo)}.`);
        this.register('socketConnectOpts', () => socketConnectOpts);
    }
    describeError(err) {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }
}
exports.ServiceAgent = ServiceAgent;
let serviceAgent = null;
function createServiceAgent(options) {
    if (!serviceAgent) {
        if (threads.parentPort) {
            serviceAgent = new ServiceAgent(threads.parentPort, options);
        }
        else {
            throw new Error(`The ParentPort for thread ${threads.threadId} is null.`);
        }
        return serviceAgent;
    }
    else {
        throw new Error(`A ServiceAgent has already been instantiated for Worker thread ${threads.threadId}.`);
    }
}
exports.createServiceAgent = createServiceAgent;
