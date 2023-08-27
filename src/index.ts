/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as threads from 'node:worker_threads';
import { Service } from './service.js';
import { Proxy } from './proxy.js';
import { log } from './logging.js';

export { Proxy, Service };

if (threads.isMainThread) {
    const { version } = require('../package.json');
    log.debug(`socketnaut v${version}`);
    log.debug(`pid ${process.pid}`);
}