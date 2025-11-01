import * as stream from "node:stream";
import { Agent } from "port_agent";
import { Node, LogContext, SyslogLevelT, Config } from "streams-logger";

export class AgentHandler extends Node<LogContext<string, SyslogLevelT>, never> {
  constructor(agent: Agent, callable: string, streamOptions?: stream.WritableOptions) {
    super(
      new stream.Writable({
        ...Config.getWritableOptions(true),
        ...streamOptions,
        ...{
          objectMode: true,
          write: (
            chunk: LogContext<string, SyslogLevelT>,
            encoding: BufferEncoding,
            callback: stream.TransformCallback
          ) => {
            (async () => {
              await agent.call(callable, chunk);
              callback();
            })().catch((reason: unknown) => {
              callback(reason instanceof Error ? reason : new Error(String(reason)));
            });
          },
        },
      })
    );
  }
}
