/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ServiceServer } from 'socketnaut';
import * as http from 'node:http';
import express from 'express';
let app = express();

app.post('/', (req, res) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    res.send('Hello World!')
  })

let service = new ServiceServer({
    server: http.createServer(app)
});

service.server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.