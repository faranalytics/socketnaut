import * as net from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import * as threads from 'node:worker_threads';
import { Agent } from 'port_agent';
import { ProxySocketAddressInfo } from './types';
import { Logger, SyslogLevel } from 'streams-logger';
import { log } from './logger.js';

threads.parentPort?.unref();

export interface ServiceAgentOptions {
    server: http.Server | https.Server | net.Server;
}

export class ServiceAgent extends Agent {

    public server: net.Server;
    public addressInfo?: string | net.AddressInfo | null;
    public agentDescription: string;
    public log: Logger<string>;

    constructor(port: threads.MessagePort, options: ServiceAgentOptions) {
        super(port);
        this.agentDescription = `Thread: ${threads.threadId}`;
        this.register('tryTerminate', this.tryTerminate.bind(this));
        this.server = options.server;
        this.server.once('listening', this.postListeningMessage.bind(this));
        this.log = log;
        this.log.setLevel(SyslogLevel.ERROR);
    }

    protected tryTerminate(): void {
        try {
            if (this.server) {
                this.server.unref();
                this.log.debug(`Process exit. ${this.agentDescription}.`);
                setImmediate(() => {
                    // Process termination is async in order to prevent `tryTerminate` from throwing an Error.
                    process.exit(0);
                }).unref();
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

    protected describeError(err: unknown): string {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }

    public async requestProxySocketAddressInfo(socket: net.Socket): Promise<ProxySocketAddressInfo> {

        const proxyServerAddress = { 'address': socket.remoteAddress, 'family': socket.remoteFamily, 'port': socket.remotePort };

        const proxyServerAddressInfo = JSON.stringify(proxyServerAddress, Object.keys(proxyServerAddress).sort());

        const clientProxyAddressInfo = await this.call<ProxySocketAddressInfo>('requestProxyAddressInfo', proxyServerAddressInfo);

        return clientProxyAddressInfo;
    }
}

let serviceAgent: ServiceAgent | null = null;

export function createServiceAgent(options: ServiceAgentOptions): ServiceAgent {
    if (!serviceAgent) {
        if (threads.parentPort) {
            serviceAgent = new ServiceAgent(threads.parentPort, options);
        } else {
            throw new Error(`The MessagePort for Worker thread ${threads.threadId} is null.`);
        }
        return serviceAgent;
    }
    else {
        throw new Error(`A ServiceAgent has already been instantiated for Worker thread ${threads.threadId}.`);
    }
}