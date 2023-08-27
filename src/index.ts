/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as threads from 'node:worker_threads';
import { ServiceServer } from './service_server.js';
import { ServiceProxy } from './service_proxy.js';
import { log, consoleHandler, formatter, Level } from './logging.js';

export { ServiceProxy, ServiceServer, log as socketlog, consoleHandler, formatter, Level };

if (threads.isMainThread) {
    const { version } = require('../package.json');
    log.debug(`socketnaut v${version}`);
    log.debug(`pid ${process.pid}`);
}