import * as threads from "node:worker_threads";
import * as net from "node:net";
import { once } from "node:events";
import { Agent } from "port_agent";

interface WorkerAgentOptions {
  worker: threads.Worker;
}

export class WorkerAgent extends Agent {
  public worker: threads.Worker;
  public connections: number;
  public socketConnectOpts: Promise<net.SocketConnectOpts | null>;

  constructor({ worker }: WorkerAgentOptions) {
    super(worker);
    this.worker = worker;
    this.connections = 0;

    this.socketConnectOpts = (async () => {
      await once(worker, "online");
      return await this.call<net.SocketConnectOpts | null>("socketConnectOpts");
    })().catch(() => null);
  }
}
