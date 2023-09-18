/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as net from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import * as threads from 'node:worker_threads';
import { Agent } from 'port_agent';
import { Metadata, MetadataHandler, LevelLogger } from 'memoir';
export declare class ServiceMessageHandler<MessageT, FormatT> extends MetadataHandler<MessageT, FormatT> {
    private agent;
    constructor(agent: Agent);
    handle(message: MessageT, meta: Metadata): Promise<void>;
}
export interface ServiceAgentOptions {
    server: http.Server | https.Server | net.Server;
}
export declare class ServiceAgent extends Agent {
    server: http.Server | https.Server | net.Server;
    addressInfo?: string | net.AddressInfo | null;
    agentDescription: string;
    log: LevelLogger<string, string>;
    logHandler: ServiceMessageHandler<string, string>;
    constructor(port: threads.MessagePort, options: ServiceAgentOptions);
    protected tryTerminate(): void;
    protected postListeningMessage(): void;
    protected describeError(err: unknown): string;
    requestProxyAddressInfo(socket: net.Socket): Promise<net.AddressInfo>;
}
export declare function createServiceAgent(options: ServiceAgentOptions): ServiceAgent;
