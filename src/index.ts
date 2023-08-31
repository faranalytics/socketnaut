/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as threads from 'node:worker_threads';
import { createServiceAgent, ServiceAgent, ServiceAgentOptions } from './service_agent.js';
import { createServiceProxy, ServiceProxy, ServiceProxyOptions } from './service_proxy.js';
import { ConsoleHandler, IMeta, LevelLogger, MetaFormatter, Level } from 'memoir';

export {
    createServiceProxy,
    ServiceProxy,
    ServiceProxyOptions,
    createServiceAgent,
    ServiceAgent,
    ServiceAgentOptions,
    Level
};

if (threads.isMainThread) {
    const log = new LevelLogger<string, string>({ name: 'socketnaut' });
    const consoleHandler = new ConsoleHandler<string, string>();
    const formatter = new MetaFormatter<string, string>(
        (message: string, { name, level, func, url, line, col }: IMeta): string =>
            `${Level[level]}:${new Date().toISOString()}:${name}:${func}:${line}:${col}:${message}`
    );

    try {
        consoleHandler.setLevel(Level.INFO);
        consoleHandler.setFormatter(formatter);
        log.addHandler(consoleHandler);
    }
    catch (err) {
        console.error(err);
    }
    const { version } = require('../package.json');
    log.info(`socketnaut v${version}`);
    log.info(`pid ${process.pid}`);
}