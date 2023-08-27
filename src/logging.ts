/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConsoleHandler, IMeta, Level, LevelLogger, MetaFormatter, BaseFormatter, Meta, LevelHandler } from 'memoir';
import { Agent } from 'port_agent';

export class ServiceMessageHandler<MessageT, FormatT> extends LevelHandler<MessageT, FormatT, Meta> {

    protected formatter?: BaseFormatter<MessageT, FormatT, Meta>;
    private agent: Agent;

    constructor(agent: Agent) {
        super();
        this.handle = this.handle.bind(this);
        this.setFormatter = this.setFormatter.bind(this);
        this.setLevel = this.setLevel.bind(this);

        this.agent = agent;
    }

    async handle(message: MessageT, meta: Meta): Promise<void> {
        if (meta.level && meta.level >= this.level) {

            if (this.formatter) {

                let formattedMessage = this.formatter.format(message, meta);
                await this.agent.call<void>('serviceLog', { level: Level[meta.level], value: formattedMessage });
            }
        }
    }
}

export { Level };
export const log = new LevelLogger<string, string>({ name: 'socketnaut' });
export const consoleHandler = new ConsoleHandler<string, string>();
export const formatter = new MetaFormatter<string, string>(
    (message: string, { name, level, func, url, line, col }: IMeta): string =>
        `${Level[level]}:${new Date().toISOString()}:${name}:${func}:${line}:${col}:${message}`
);

try {
    consoleHandler.setLevel(Level.DEBUG);
    consoleHandler.setFormatter(formatter);
    log.addHandler(consoleHandler);
}
catch (err) {
    console.error(err);
}