/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as net from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import * as threads from 'node:worker_threads';
import { Agent } from 'port_agent';
import { BaseFormatter, ConsoleHandler, IMeta, Level, LevelHandler, LevelLogger, Meta, MetaFormatter } from 'memoir';

threads.parentPort?.unref();

export class ServiceMessageHandler<MessageT, FormatT> extends LevelHandler<MessageT, FormatT, Meta> {

    protected formatter?: BaseFormatter<MessageT, FormatT, Meta>;
    private agent: Agent;

    constructor(agent: Agent) {
        super();
        this.handle = this.handle.bind(this);
        this.setFormatter = this.setFormatter.bind(this);
        this.setLevel = this.setLevel.bind(this);

        this.agent = agent;
    }

    async handle(message: MessageT, meta: Meta): Promise<void> {
        if (meta.level && meta.level >= this.level) {

            if (this.formatter) {

                const formattedMessage = this.formatter.format(message, meta);
                await this.agent.call<void>('serviceLog', { level: Level[meta.level], value: formattedMessage });
            }
        }
    }
}

export interface ServiceAgentOptions {
    server: http.Server | https.Server | net.Server;
}

export class ServiceAgent extends Agent {

    public server: http.Server | https.Server | net.Server;
    public addressInfo?: string | net.AddressInfo | null;
    public agentDescription: string;
    public log: LevelLogger<string, string>;
    public logHandler: ServiceMessageHandler<string, string>;
    public logFormatter: MetaFormatter<string, string>;

    constructor(port: threads.MessagePort, options: ServiceAgentOptions) {
        super(port);
        this.agentDescription = `Thread: ${threads.threadId}`;
        this.register('tryTerminate', this.tryTerminate.bind(this));
        this.server = options.server;
        this.server.once('listening', this.postListeningMessage.bind(this));

        this.log = new LevelLogger<string, string>({ name: `Agent ${threads.threadId}` });
        const messageHandler = this.logHandler = new ServiceMessageHandler<string, string>(this);
        const formatter = this.logFormatter = new MetaFormatter<string, string>(
            (message: string, { name, level, func, url, line, col }: IMeta): string =>
                `${func}:${line}:${col}:${message}`
        );
        messageHandler.setLevel(Level.INFO);
        messageHandler.setFormatter(formatter);
        this.log.addHandler(messageHandler);
    }

    protected tryTerminate() {
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

    protected postListeningMessage(): void {

        this.addressInfo = this.server?.address();

        let socketConnectOpts: net.SocketConnectOpts | null;

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

    protected describeError(err: unknown) {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }
}

let serviceAgent: ServiceAgent | null = null;

export function createServiceAgent(options: ServiceAgentOptions): ServiceAgent {
    if (!serviceAgent) {
        if (threads.parentPort) {
            serviceAgent = new ServiceAgent(threads.parentPort, options);
        } else {
            throw new Error(`The ParentPort for thread ${threads.threadId} is null.`);
        }
        return serviceAgent;
    }
    else {
        throw new Error(`A ServiceAgent has already been instantiated for this Worker thread ${threads.threadId}.`);
    }
}