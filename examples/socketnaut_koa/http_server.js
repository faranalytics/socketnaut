import Koa from "koa";
import { createServiceAgent, Level } from "socketnaut";

const app = new Koa();

const server = app.listen({ port: 0, host: "127.0.0.1" });
// Specifying port 0 here will instruct the Server to listen on a random port.
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.

const agent = createServiceAgent({ server });

agent.log.setLevel(Level.DEBUG);

app.use((ctx) => {
  for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
  ctx.body = "Hello, World!";
});
