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
    public socketConnectOptsReady: Promise<boolean>;

    constructor({
        worker,
    }: WorkerAgentOptions
    ) {
        super(worker);
        this.worker = worker;
        this.connections = 0;

        this.socketConnectOptsReady = new Promise<boolean>((r, e) => {
            worker.once('exit', e);
            worker.once('error', e);

            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            worker.once('online', async () => {
                try {
                    const socketConnectOpts = await this.call<net.SocketConnectOpts>('socketConnectOpts');
                    if (socketConnectOpts) {
                        this.socketConnectOpts = socketConnectOpts;
                    }
                    else {
                        e('The Worker came online; however, it is missing a socketConnectOpts.');
                    }

                    worker.removeListener('exit', e);
                    worker.removeListener('error', e);

                    r(true);
                }
                catch (err) {
                    e(err);
                }
            });
        });
    }
}
