/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as net from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import * as thread from 'node:worker_threads';
import { Agent } from 'port_agent';
import { ServiceMessageHandler } from './logging';
import { IMeta, Level, LevelLogger, MetaFormatter } from 'memoir';

const log = new LevelLogger<string, string>({ name: 'socketnaut' });

export interface ServiceServerOptions {
    server: https.Server | http.Server;
}

export class ServiceServer {

    public server: http.Server | https.Server;
    public addressInfo?: string | net.AddressInfo | null;
    public agent?: Agent;
    public serverDescription: string;

    constructor({
        server
    }: ServiceServerOptions) {

        this.server = server;

        this.serverDescription = `Thread: ${thread.threadId}`;

        if (thread.parentPort) {
            this.agent = new Agent(thread.parentPort);
            try {
                const messageHandler = new ServiceMessageHandler<string, string>(this.agent);
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
        else {
            console.error(`The parent port is null.  ${this.serverDescription}.`);
            process.exit(0);
        }

        this.server.once('listening', this.postListeningMessage.bind(this));

        thread.parentPort?.unref();

        this.agent?.register('tryTerminate', this.tryTerminate.bind(this));
    }

    protected tryTerminate() {
        try {
            this.server.close();
            this.server.closeAllConnections();
            this.server.unref();
            log.debug(`Process exit.  ${this.serverDescription}.`);
            setImmediate(() => {
                process.exit(0);
            });
        }
        catch (err) {
            log.error(this.describeError(err));
        }
        finally {
            setTimeout(this.tryTerminate.bind(this), 4).unref();
        }
    }

    protected postListeningMessage(): void {

        this.addressInfo = this.server.address();

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

        log.debug(`Server thread ${thread.threadId} is listening on ${JSON.stringify(this.addressInfo)}.`);

        this.agent?.register('socketConnectOpts', () => socketConnectOpts);
    }

    protected describeError(err: unknown) {
        return `Error: ${err instanceof Error ? err.stack ? err.stack : err.message : 'Error'}`;
    }
}