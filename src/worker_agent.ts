/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as threads from 'node:worker_threads';
import * as net from 'node:net';
import { Agent } from 'port_agent';

interface WorkerAgentOptions {
    worker: threads.Worker;
}

export class WorkerAgent extends Agent {
    public worker: threads.Worker;
    public connections: number;
    public socketConnectOpts?: net.SocketConnectOpts;
    public online: Promise<net.SocketConnectOpts>;

    constructor({
        worker,
    }: WorkerAgentOptions
    ) {
        super(worker);
        this.worker = worker;
        this.connections = 0;

        this.online = new Promise<net.SocketConnectOpts>((r, j) => {

            worker.once('exit', j);

            worker.once('error', j);

            worker.once('online', async () => {
                const socketConnectOpts = await this.call<net.SocketConnectOpts>('socketConnectOpts');
                if (socketConnectOpts) {
                    this.socketConnectOpts = socketConnectOpts;
                }
                else {
                    j("The Worker came online; however, it is missing a socketConnectOpts.");
                }

                r(socketConnectOpts);

                worker.removeListener('exit', j);
                worker.removeListener('error', j);
            });
        });
    }
}
