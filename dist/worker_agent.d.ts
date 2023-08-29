/// <reference types="node" />
/// <reference types="node" />
import * as threads from 'node:worker_threads';
import * as net from 'node:net';
import { Agent } from 'port_agent';
interface WorkerAgentOptions {
    worker: threads.Worker;
}
export declare class WorkerAgent extends Agent {
    worker: threads.Worker;
    connections: number;
    socketConnectOpts?: net.SocketConnectOpts;
    online: Promise<net.SocketConnectOpts>;
    constructor({ worker, }: WorkerAgentOptions);
}
export {};
