import * as threads from "node:worker_threads";
import { createServiceAgent, ServiceAgent, ServiceAgentOptions } from "./service_agent.js";
import { createServiceProxy, ServiceProxy, ServiceProxyOptions } from "./service_proxy.js";
import { WorkerAgent } from "./worker_agent.js";
import { ProxySocketAddressInfo } from "./types.js";
import { SyslogLevel, SyslogLevel as Level } from "streams-logger";
import { log, logger, formatter, consoleHandler } from "./logging/logger.js";

export {
  createServiceProxy,
  ServiceProxy,
  ServiceProxyOptions,
  createServiceAgent,
  ServiceAgent,
  ServiceAgentOptions,
  ProxySocketAddressInfo,
  WorkerAgent,
  SyslogLevel,
  Level,
  logger,
  formatter,
  consoleHandler,
  log,
};

if (threads.isMainThread) {
  try {
    const { version } = require("../package.json") as { version: string };
    log.info(`socketnaut v${version}`);
    log.info(`pid ${process.pid.toString()}`);
  } catch (err) {
    log.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  }
}
