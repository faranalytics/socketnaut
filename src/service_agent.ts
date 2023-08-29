/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as net from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import * as threads from 'node:worker_threads';
import { Agent } from 'port_agent';
import { ServiceMessageHandler } from './logging';
import { IMeta, Level, LevelLogger, MetaFormatter } from 'memoir';

threads.parentPort?.unref();

const log = new LevelLogger<string, string>({ name: 'socketnaut' });

export interface ServiceAgentOptions {
    server: http.Server | https.Server | net.Server;
}

export class ServiceAgent extends Agent {

    public server: http.Server | https.Server | net.Server;
    public addressInfo?: string | net.AddressInfo | null;
    public agentDescription: string;

    constructor(port: threads.MessagePort, options: ServiceAgentOptions) {
        super(port);
        this.agentDescription = `Thread: ${threads.threadId}`;
        this.register('tryTerminate', this.tryTerminate.bind(this));
        this.server = options.server;
        this.server.once('listening', this.postListeningMessage.bind(this));

        try {
            const messageHandler = new ServiceMessageHandler<string, string>(this);
            const formatter = new MetaFormatter<string, string>(
                (message: string, { name, level, func, url, line, col }: IMeta): string =>
                    `${func}:${line}:${col}:${message}`
            );
            messageHandler.setLevel(Level.DEBUG);
            messageHandler.setFormatter(formatter);
            log.addHandler(messageHandler);
        }
        catch (err) {
            console.error(err);
        }
    }

    protected tryTerminate() {
        try {
            if (this.server) {
                this.server.unref();
                log.debug(`Process exit.  ${this.agentDescription}.`);
                setImmediate(() => {
                    process.exit(0);
                });
            }
        }
        catch (err) {
            log.error(this.describeError(err));
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

        log.debug(`Server thread ${threads.threadId} is listening on ${JSON.stringify(this.addressInfo)}.`);

        this.register('socketConnectOpts', () => socketConnectOpts);
    }

    protected describeError(err: unknown) {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }
}

let serviceAgent: ServiceAgent | null = null;

export function instantiateServiceAgent(options: ServiceAgentOptions): ServiceAgent {
    if (!serviceAgent) {
        if (threads.parentPort) {
            serviceAgent = new ServiceAgent(threads.parentPort, options);
        } else {
            throw new Error(`The ParentPort for thread ${threads.threadId} is null.`);
        }
        return serviceAgent;
    }
    else {
        throw new Error(`A Service Agent has already been instantiated for this Worker thread ${threads.threadId}.`);
    }
}