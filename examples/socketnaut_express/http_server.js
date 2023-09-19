import * as http from 'node:http';
import express from 'express';
import { createServiceAgent, Level } from 'socketnaut';

const app = express();

app.get('/', (req, res) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    res.send('Hello World!');
  });

const service = createServiceAgent({
    server: http.createServer(app)
});

service.logHandler.setLevel(Level.DEBUG)

service.server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will instruct the Server to listen on a random port.  
// Socketnaut will communicate the randomly selected port to the ServiceProxy.