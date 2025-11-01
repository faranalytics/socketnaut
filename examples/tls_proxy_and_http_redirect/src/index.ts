import * as net from "node:net";
import * as tls from "node:tls";
import * as fs from "fs";
import { Level, createServiceProxy, WorkerAgent } from "socketnaut";
import { CERT_PATH, KEY_PATH } from "./paths.js";

const server = net.createServer(); // Configure this TCP Server however you choose.

server.listen({ port: 3080, host: "0.0.0.0" });

// Create a Service Proxy for redirecting HTTP requests to the secure port.
const httpProxy = createServiceProxy({
  server,
  minWorkers: 2,
  maxWorkers: 2,
  workersCheckingInterval: 1e4,
  workerURL: new URL("./http_redirect_service.js", import.meta.url),
});

httpProxy.log.setLevel(Level.DEBUG);

const tlsServer = tls.createServer({
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH),
}); // Configure this TLS server however you choose.

tlsServer.listen({ port: 3443, host: "0.0.0.0" });

// Create a Service Proxy for handling HTTP requests.
const tlsProxy = createServiceProxy({
  server: tlsServer,
  minWorkers: 4,
  maxWorkers: 42,
  workerURL: new URL("./service.js", import.meta.url),
});

tlsProxy.log.setLevel(Level.DEBUG);

// Display the state of the HTTP server pool each 1000ms.
setInterval(() => {
  tlsProxy.log.info(
    `proxy.agents.length: ${tlsProxy.agents.length.toString()}, proxy.maxWorkers: ${tlsProxy.maxWorkers?.toString() ?? ""}, proxy.minWorkers: ${tlsProxy.minWorkers.toString()}.`
  );
  tlsProxy.log.info(
    `Connection Distribution: ${JSON.stringify(tlsProxy.agents.map<number>((value: WorkerAgent) => value.connections))}`
  );
}, 1000);
