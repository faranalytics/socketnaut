/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as threads from 'node:worker_threads';
import { createServiceAgent, ServiceAgent, ServiceAgentOptions } from './service_agent.js';
import { createServiceProxy, ServiceProxy, ServiceProxyOptions } from './service_proxy.js';
import { ConsoleHandler, Metadata, LevelLogger, MetadataFormatter, Level } from 'memoir';

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
    const formatter = (message: string, { name, level, func, url, line, col }: Metadata): string =>
        `${level}:${new Date().toISOString()}:${name}:${func}:${line}:${col}:${message}`;

    const log = new LevelLogger<string, string>({ name: 'socketnaut', level: Level.INFO });
    const consoleHandler = new ConsoleHandler<string, string>();
    const metadataFormatter = new MetadataFormatter<string, string>({ formatter });

    consoleHandler.setLevel(Level.DEBUG);
    consoleHandler.setFormatter(metadataFormatter);
    log.addHandler(consoleHandler);

    const { version } = require('../package.json');
    log.info?.(`socketnaut v${version}`);
    log.info?.(`pid ${process.pid}`);
}