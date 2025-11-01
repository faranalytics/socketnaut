import * as http from "node:http";
import { Level, createServiceAgent } from "socketnaut";

const server = http.createServer(); // Configure this HTTP server however you choose.

server.listen({ port: 0, host: "127.0.0.1" });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.

server.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (req.url) {
    const url = new URL(req.url, `http://${req.headers.host ?? ""}`);
    res.writeHead(301, { location: `https://${url.hostname}:3443${url.pathname}` }).end();
    console.log(`Request: ${url.toString()}`);
  }
});

const agent = createServiceAgent({ server });

agent.log.setLevel(Level.DEBUG);
