import * as net from "node:net";
import { createServiceProxy, Level } from "socketnaut";

const server = net.createServer(); // Configure this TCP Server however you choose.

server.listen({ port: 3080, host: "0.0.0.0" });

const proxy = createServiceProxy({
  server,
  minWorkers: 4,
  maxWorkers: 42,
  workerURL: "./http_server.js",
});

proxy.log.setLevel(Level.DEBUG);
