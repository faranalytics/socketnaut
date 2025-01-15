import * as stream from 'node:stream';
import { Node, LogContext, SyslogLevelT, Config, LogContextOptions} from 'streams-logger';

export class ContextHandler extends Node<LogContext<string, SyslogLevelT>, LogContext<string, SyslogLevelT>> {
    constructor(streamOptions?: stream.TransformOptions) {
        super(new stream.PassThrough({
            ...Config.getDuplexOptions(true, true),
            ...streamOptions, ...{
                readableObjectMode: true,
                writableObjectMode: true
            }
        }));
    }

    public async write(logContextOptions: LogContextOptions<string, SyslogLevelT>): Promise<void> {
        try {
            const logContext = new LogContext<string, SyslogLevelT>(logContextOptions);
            await super._write(logContext);
        }
        catch (err) {
            if (err instanceof Error) {
                Config.errorHandler(err);
            }
        }
    }
}
