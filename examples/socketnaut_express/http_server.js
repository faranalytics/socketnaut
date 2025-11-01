import * as http from "node:http";
import express from "express";
import { createServiceAgent, Level } from "socketnaut";

const app = express();

app.get("/", (req, res) => {
  for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
  res.send("Hello, World!");
});

const server = http.createServer(app); // Configure this HTTP Server however you choose.

server.listen({ port: 0, host: "127.0.0.1" });
// Specifying port 0 here will instruct the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });

agent.log.setLevel(Level.DEBUG);
