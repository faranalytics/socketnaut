import {
    Logger,
    Formatter,
    ConsoleHandler,
    SyslogLevel,
} from 'streams-logger';

export const logger = new Logger({ level: SyslogLevel.INFO, captureStackTrace: false, parent: null });
export const formatter = new Formatter({
    format: async ({ level, isotime, hostname, pid, message, }) => (
        `<${level}> ${isotime} ${hostname} ${pid} - ${message}\n`
    )
});
export const consoleHandler = new ConsoleHandler({ level: SyslogLevel.DEBUG });
export const log = logger.connect(
    formatter.connect(
        consoleHandler
    )
);