import { ConsoleHandler, Level, LevelLogger, MetaFormatter, BaseFormatter, Meta, LevelHandler } from 'memoir';
import { Agent } from 'port_agent';
export declare class ServiceMessageHandler<MessageT, FormatT> extends LevelHandler<MessageT, FormatT, Meta> {
    protected formatter?: BaseFormatter<MessageT, FormatT, Meta>;
    private agent;
    constructor(agent: Agent);
    handle(message: MessageT, meta: Meta): Promise<void>;
}
export { Level };
export declare const log: LevelLogger<string, string>;
export declare const consoleHandler: ConsoleHandler<string, string>;
export declare const formatter: MetaFormatter<string, string>;
