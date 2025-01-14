import * as threads from 'node:worker_threads';
import * as net from 'node:net';
import { once } from 'node:events';
import { Agent } from 'port_agent';

interface WorkerAgentOptions {
    worker: threads.Worker;
}

export class WorkerAgent extends Agent {
    public worker: threads.Worker;
    public connections: number;
    public socketConnectOpts?: net.SocketConnectOpts;
    public socketConnectOptsReady: Promise<boolean>;

    constructor({ worker }: WorkerAgentOptions
    ) {
        super(worker);
        this.worker = worker;
        this.connections = 0;

        this.socketConnectOptsReady = (async () => {
            await once(worker, 'online');
            const socketConnectOpts = await this.call<net.SocketConnectOpts>('socketConnectOpts');
            if (socketConnectOpts) {
                this.socketConnectOpts = socketConnectOpts;
            }
            else {
                throw new Error('The Worker came online; however, it is missing a socketConnectOpts.');
            }
            return true;
        })();
    }
}
