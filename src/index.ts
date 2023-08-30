/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as threads from 'node:worker_threads';
import { createServiceAgent, ServiceAgent, ServiceAgentOptions } from './service_agent.js';
import { createServiceProxy, ServiceProxy, ServiceProxyOptions } from './service_proxy.js';
import { log, consoleHandler, formatter, Level } from './logging.js';

export {
    createServiceProxy,
    ServiceProxy,
    ServiceProxyOptions,
    createServiceAgent,
    ServiceAgent,
    ServiceAgentOptions,
    log as socketlog,
    consoleHandler,
    formatter,
    Level
};

if (threads.isMainThread) {
    const { version } = require('../package.json');
    log.info(`socketnaut v${version}`);
    log.info(`pid ${process.pid}`);
}