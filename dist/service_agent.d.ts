/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as net from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import * as threads from 'node:worker_threads';
import { Agent } from 'port_agent';
export interface ServiceAgentOptions {
    server: http.Server | https.Server | net.Server;
}
export declare class ServiceAgent extends Agent {
    server: http.Server | https.Server | net.Server;
    addressInfo?: string | net.AddressInfo | null;
    agentDescription: string;
    constructor(port: threads.MessagePort, options: ServiceAgentOptions);
    protected tryTerminate(): void;
    protected postListeningMessage(): void;
    protected describeError(err: unknown): string;
}
export declare function createServiceAgent(options: ServiceAgentOptions): ServiceAgent;
