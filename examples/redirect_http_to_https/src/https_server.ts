import * as http from "node:http";
import * as https from "node:https";
import * as fs from "fs";
import { Level, createServiceAgent } from "socketnaut";
import { CERT_PATH, KEY_PATH } from "./paths.js";

const server = https.createServer({
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH),
}); // Configure this HTTPS server however you choose.

server.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
  for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
  res.end("Hello, World!");
});

server.listen({ port: 0, host: "127.0.0.1" });
// Specifying port 0 here will cause the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });

agent.log.setLevel(Level.DEBUG);
