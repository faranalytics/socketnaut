/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as http from 'node:http';
import { ServiceServer } from 'socketnaut';
import Fastify from 'fastify';

const serverFactory = (handler, opts) => {
    const service = new ServiceServer({
        server: http.createServer(opts, handler)
    });

    return service.server;
};

const fastify = Fastify({ serverFactory });

fastify.post('/', (req, reply) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    void reply.send({ hello: 'world' });
});

void fastify.listen({ port: 0, host: '127.0.0.1' }); 
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.