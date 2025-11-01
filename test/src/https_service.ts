import * as https from "node:https";
import * as fs from "fs";
import * as http from "node:http";
import { createServiceAgent, ProxySocketAddressInfo } from "socketnaut";
import { Writable } from "node:stream";
import { KEY_PATH, CERT_PATH } from "./paths.js";
import { KeysUppercase } from "streams-logger/dist/commons/types.js";
import { SyslogLevel, SyslogLevelT } from "streams-logger";

class StreamBuffer extends Writable {
  public buffer: Buffer = Buffer.allocUnsafe(0);
  _write(chunk: string | Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (!(chunk instanceof Buffer)) {
      chunk = Buffer.from(chunk);
    }
    this.buffer = Buffer.concat([this.buffer, chunk]);
    callback();
  }
}

const arg: Record<string, string> = process.argv.slice(2).reduce((prev: Record<string, string>, curr: string) => {
  const [key, value] = curr.trim().split("=");
  return { ...prev, [key]: value };
}, {});

const LEVEL = arg.level as unknown as KeysUppercase<SyslogLevelT>;

const server = https.createServer({
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH),
});

const agent = createServiceAgent({ server });

agent.log.setLevel(SyslogLevel[LEVEL]);

// eslint-disable-next-line @typescript-eslint/no-misused-promises
server.on("request", async (req: http.IncomingMessage, res: http.ServerResponse) => {
  for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
  const proxyAddressInfo: ProxySocketAddressInfo = await agent.requestProxySocketAddressInfo(req.socket);
  agent.log.debug(JSON.stringify(proxyAddressInfo));
  const streamBuf = new StreamBuffer();
  req.pipe(streamBuf);
  req.on("end", () => {
    res.writeHead(200);
    res.end(streamBuf.buffer);
  });
});

server.listen({ port: 0, host: "127.0.0.1" });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.
