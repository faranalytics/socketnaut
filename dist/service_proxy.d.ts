/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as net from 'node:net';
import * as threads from 'node:worker_threads';
import { WorkerAgent } from './worker_agent.js';
export interface ServiceProxyOptions {
    server: net.Server;
    workerURL: string | URL;
    minWorkers: number;
    maxWorkers?: number;
    workersCheckingInterval?: number;
    workerOptions?: threads.WorkerOptions;
}
export declare class ServiceProxy {
    server: net.Server;
    workerURL: string | URL;
    minWorkers: number;
    maxWorkers?: number;
    workersCheckingInterval?: number;
    workerOptions?: threads.WorkerOptions;
    agents: Array<WorkerAgent>;
    constructor({ server, workerURL, minWorkers, maxWorkers, workersCheckingInterval, workerOptions }: ServiceProxyOptions);
    protected handleClientSocket(clientProxySocket: net.Socket): void;
    protected tryAllocateThread(clientProxySocket: net.Socket): Promise<void>;
    protected createServerConnection(clientProxySocket: net.Socket, socketConnectOpts: net.SocketConnectOpts): Promise<void>;
    protected checkThreads(): Promise<void>;
    protected removeAgent(agent: WorkerAgent): void;
    protected reorderAgent(agent: WorkerAgent): void;
    protected spawnMinWorkers(): Promise<void>;
    protected spawnWorker(): WorkerAgent;
    protected serviceLog(message: {
        level: string;
        value: string;
    }): void;
    protected describeError(err: unknown): string;
}
export declare function createServiceProxy(options: ServiceProxyOptions): ServiceProxy;
