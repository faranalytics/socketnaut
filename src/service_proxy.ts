import * as net from "node:net";
import * as tls from "node:tls";
import { EventEmitter, once } from "node:events";
import * as threads from "node:worker_threads";
import { LogContextOptions, Logger } from "streams-logger";
import { log, contextHandler } from "./logging/logger.js";
import { WorkerAgent } from "./worker_agent.js";
import { ProxySocketAddressInfo } from "./types.js";

export interface ServiceProxyOptions {
  server: net.Server;
  workerCount?: number;
  workerURL: string | URL;
  minWorkers?: number;
  maxWorkers?: number;
  workersCheckingInterval?: number;
  workerOptions?: threads.WorkerOptions;
}

export class ServiceProxy extends EventEmitter {
  public log: Logger;
  public server: net.Server;
  public workerCount?: number;
  public workerURL: string | URL;
  public minWorkers: number;
  public maxWorkers?: number;
  public workersCheckingInterval?: number;
  public workersCheckingIntervalTimeout?: NodeJS.Timeout;
  public workerOptions?: threads.WorkerOptions;
  public agents: WorkerAgent[];
  public proxySocketAddressInfo: Map<string, ProxySocketAddressInfo>;
  public proxyAddressInfoRepr?: string;
  public proxyAddressInfo?: net.AddressInfo | string | null;

  constructor({
    server,
    workerCount,
    workerURL,
    minWorkers = 0,
    maxWorkers,
    workersCheckingInterval,
    workerOptions,
  }: ServiceProxyOptions) {
    super();
    if (workerCount !== undefined && workerCount < 1) {
      throw new Error("workerCount must be at least 1");
    }
    if (maxWorkers !== undefined && maxWorkers < 1) {
      throw new Error("maxWorkers must be at least 1 or undefined for unbounded scaling");
    }
    if (minWorkers < 0) {
      throw new Error("minWorkers must be non-negative");
    }
    if (maxWorkers !== undefined && minWorkers > maxWorkers) {
      throw new Error("minWorkers cannot exceed maxWorkers");
    }
    this.log = log;
    this.server = server;
    this.workerCount = workerCount;
    this.workerURL = workerURL;
    this.minWorkers = workerCount ?? minWorkers;
    this.maxWorkers = workerCount ?? maxWorkers;
    this.workersCheckingInterval = workersCheckingInterval;
    this.workerOptions = workerOptions;
    this.agents = [];
    this.proxySocketAddressInfo = new Map<string, ProxySocketAddressInfo>();
    if (this.server instanceof tls.Server) {
      this.server.on("secureConnection", this.tryAllocateThread);
    } else if (this.server instanceof net.Server) {
      this.server.on("connection", this.tryAllocateThread);
    } else {
      log.error("The Service Proxy Server must be of type net.Server or tls.Server.");
    }

    this.server.on("listening", () => {
      this.proxyAddressInfo = this.server.address();
      this.proxyAddressInfoRepr = JSON.stringify(this.proxyAddressInfo);
      log.info(`Service Proxy listening on ${this.proxyAddressInfoRepr}`);
    });

    this.spawnMinWorkers().catch((reason: unknown) => {
      log.error(this.describeError(reason));
    });

    if (this.workersCheckingInterval) {
      this.workersCheckingIntervalTimeout = setTimeout(this.checkThreads, this.workersCheckingInterval);
    }
  }

  protected tryAllocateThread = (clientProxySocket: net.Socket): void => {
    let agent: WorkerAgent | undefined;
    try {
      clientProxySocket.on("error", (err: Error) => {
        log.error(`Client-Proxy socket error.  ${this.describeError(err)}.`);
      });

      clientProxySocket.pause();

      agent = this.selectWorkerAgent();
      clientProxySocket.once("close", () => {
        if (agent) {
          agent.connections = agent.connections - 1;
          this.reorderAgent(agent);
        }
      });
      this.reorderAgent(agent);

      (async () => {
        try {
          const socketConnectOpts = await agent.socketConnectOpts;
          if (!socketConnectOpts) {
            throw new Error("The Worker came online; however, the socketConnectOpts is invalid.");
          }
          if (clientProxySocket.closed) {
            const tuple = `${clientProxySocket.remoteAddress ?? ""}:${clientProxySocket.remotePort?.toString() ?? ""}, ${clientProxySocket.localAddress ?? ""}:${clientProxySocket.localPort?.toString() ?? ""}, ${clientProxySocket.localFamily ?? ""}`;
            log.debug(
              `The Client-Proxy socket ${tuple} closed prior to proxying the connection. Proxy: ${this.proxyAddressInfoRepr ?? ""}.`
            );
            return;
          }
          await this.createServerConnection(clientProxySocket, socketConnectOpts);
        } catch (err: unknown) {
          log.error(this.describeError(err));
          this.removeAgent(agent);
          clientProxySocket.destroy();
          agent.call("tryTerminate").catch((reason: unknown) => {
            log.error(this.describeError(reason));
          });
        }
      })().catch((reason: unknown) => {
        log.error(this.describeError(reason));
      });
    } catch (err: unknown) {
      log.error(this.describeError(err));
      if (agent) {
        this.removeAgent(agent);
        agent.call("tryTerminate").catch((reason: unknown) => {
          log.error(this.describeError(reason));
        });
      }

      clientProxySocket.destroy();
    }
  };

  protected selectWorkerAgent = (): WorkerAgent => {
    if (this.agents[0]?.connections == 0 || this.agents.length === this.maxWorkers) {
      const agent = this.agents[0];
      agent.connections = agent.connections + 1;
      return agent;
    } else {
      const agent = this.spawnWorker();
      agent.connections = agent.connections + 1;
      return agent;
    }
  };

  protected createServerConnection = async (
    clientProxySocket: net.Socket,
    socketConnectOpts: net.SocketConnectOpts
  ): Promise<void> => {
    const proxyServerSocket = net.createConnection(socketConnectOpts);

    try {
      proxyServerSocket.on("error", (err: Error) => {
        log.error(
          `Proxy-Server socket error.  ${this.describeError(err)}  Connect options: ${JSON.stringify(socketConnectOpts)}.`
        );
      });

      await once(proxyServerSocket, "connect");

      const proxyServerSocketAddressInfo = proxyServerSocket.address();
      const proxyServerSocketAddressInfoRepr = JSON.stringify(
        proxyServerSocketAddressInfo,
        Object.keys(proxyServerSocketAddressInfo).sort()
      );
      this.proxySocketAddressInfo.set(proxyServerSocketAddressInfoRepr, {
        local: {
          address: clientProxySocket.localAddress ?? "",
          family: clientProxySocket.localFamily ?? "",
          port: clientProxySocket.localPort ?? NaN,
        },
        remote: {
          address: clientProxySocket.remoteAddress ?? "",
          family: clientProxySocket.remoteFamily ?? "",
          port: clientProxySocket.remotePort ?? NaN,
        },
      });

      proxyServerSocket.once("close", () => {
        log.debug(`Proxy-Server socket close. Connect options: ${JSON.stringify(socketConnectOpts)}.`);
        clientProxySocket.destroy();
        this.proxySocketAddressInfo.delete(proxyServerSocketAddressInfoRepr);
      });

      proxyServerSocket.on("timeout", () => {
        log.debug(`Proxy-Server socket timeout. Connect options: ${JSON.stringify(socketConnectOpts)}.`);
      });

      clientProxySocket.on("timeout", () => {
        log.debug(`Client-Proxy socket timeout. Connect options: ${JSON.stringify(socketConnectOpts)}.`);
      });

      proxyServerSocket.once("end", () => {
        log.debug(`Proxy-Server socket end. Connect options: ${JSON.stringify(socketConnectOpts)}.`);
        clientProxySocket.end();
      });

      clientProxySocket.once("end", () => {
        log.debug(`Client-Proxy socket end.  Connect options: ${JSON.stringify(socketConnectOpts)}.`);
        proxyServerSocket.end();
      });

      clientProxySocket.once("close", () => {
        log.debug(`Client-Proxy socket close. Connect options: ${JSON.stringify(socketConnectOpts)}.`);
        proxyServerSocket.destroy();
      });

      clientProxySocket.pipe(proxyServerSocket);
      proxyServerSocket.pipe(clientProxySocket);
    } catch (err) {
      proxyServerSocket.destroy(); // ← Explicitly destroy on error!
      throw err; // Re-throw to maintain existing error handling
    }
  };

  protected checkThreads = (): void => {
    if (!this.server.listening) {
      return;
    }
    (async () => {
      try {
        log.debug(`Thread Count: ${this.agents.length.toString()}`);

        if (this.agents.length > this.minWorkers) {
          for (const agent of [...this.agents]) {
            const socketConnectOpts = await agent.socketConnectOpts;
            if (socketConnectOpts && agent.connections === 0) {
              try {
                this.removeAgent(agent);
                await agent.call("tryTerminate");
              } catch (err) {
                log.error(this.describeError(err));
              }

              if (this.agents.length <= this.minWorkers) {
                break;
              }
            }
          }
        }
      } finally {
        if (this.server.listening) {
          this.workersCheckingIntervalTimeout = setTimeout(this.checkThreads, this.workersCheckingInterval);
        }
      }
    })().catch((reason: unknown) => {
      log.error(this.describeError(reason));
    });
  };

  protected removeAgent = (agent: WorkerAgent): void => {
    const index = this.agents.indexOf(agent);
    if (index != -1) {
      this.agents.splice(index, 1);
    }
  };

  protected reorderAgent = (agent: WorkerAgent): void => {
    const index = this.agents.indexOf(agent);

    if (index == -1) {
      return;
    }

    this.agents.splice(index, 1);

    for (let i = 0; i < this.agents.length; i = i + 1) {
      if (agent.connections < this.agents[i].connections) {
        this.agents.splice(i, 0, agent);
        return;
      }
    }

    this.agents.push(agent);
  };

  protected spawnMinWorkers = async (): Promise<void> => {
    try {
      while (this.agents.length < this.minWorkers) {
        const agent = this.spawnWorker();
        await agent.socketConnectOpts;
      }
    } catch (err) {
      log.error(this.describeError(err));
    } finally {
      this.emit("ready", ...this.agents);
    }
  };

  protected spawnWorker = (): WorkerAgent => {
    const worker = new threads.Worker(this.workerURL, this.workerOptions);
    const agent = new WorkerAgent({ worker });
    this.agents.unshift(agent);
    worker.once("error", (err: Error) => {
      log.error(this.describeError(err));
      this.removeAgent(agent);
    });
    worker.once("exit", () => {
      this.removeAgent(agent);
    });
    agent.register("serviceLog", this.serviceLog);
    agent.register("requestProxyAddressInfo", this.requestProxySocketAddressInfo);
    return agent;
  };

  protected serviceLog = (logContextOptions: LogContextOptions): void => {
    void contextHandler.write(logContextOptions);
  };

  protected requestProxySocketAddressInfo = (proxyServerAddressInfo: string): ProxySocketAddressInfo | undefined => {
    const proxySocketAddressInfo = this.proxySocketAddressInfo.get(proxyServerAddressInfo);
    return proxySocketAddressInfo;
  };

  protected describeError = (err: unknown): string => {
    return err instanceof Error ? (err.stack ?? err.message) : String(err);
  };

  public shutdown = async (): Promise<PromiseSettledResult<unknown>[]> => {
    this.minWorkers = 0;
    clearTimeout(this.workersCheckingIntervalTimeout);
    await new Promise((r, e) => {
      this.server.close((err) => {
        if (err) {
          e(err);
        } else {
          r(true);
        }
      });
    });
    if (this.server instanceof tls.Server) {
      this.server.removeAllListeners("secureConnection");
    } else if (this.server instanceof net.Server) {
      this.server.removeAllListeners("connection");
    }
    const exits = this.agents.map((agent: WorkerAgent) => {
      const promise = new Promise((r, j) => {
        agent.worker.on("exit", r);
        agent.worker.on("error", j);
      });
      agent.call("tryTerminate").catch(() => {
        /* empty */
      });
      return promise;
    });
    return Promise.allSettled(exits);
  };
}

export function createServiceProxy(options: ServiceProxyOptions): ServiceProxy {
  return new ServiceProxy(options);
}
