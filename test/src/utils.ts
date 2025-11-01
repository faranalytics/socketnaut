import * as http from "node:http";
import { once } from "node:events";
import { ChildProcess } from "node:child_process";

export interface DispatchResult {
  incomingMessage: http.IncomingMessage;
  body: Buffer;
}

export async function dispatch(req: http.ClientRequest, data: string | Buffer): Promise<DispatchResult> {
  req.end(data);
  const [incomingMessage] = (await once(req, "response")) as [http.IncomingMessage];
  const chunks: Buffer[] = [];
  incomingMessage.on("data", (datum: Buffer) => {
    chunks.push(datum);
  });
  await once(incomingMessage, "end");
  return { incomingMessage, body: Buffer.concat(chunks) };
}

export async function listen(process: ChildProcess | NodeJS.Process, message: string) {
  while (JSON.stringify((await once(process, "message"))[0]) != JSON.stringify(message));
}
