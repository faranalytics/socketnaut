import * as http from 'node:http';
import Fastify from 'fastify';
import { createServiceAgent, Level } from 'socketnaut';

const serverFactory = (handler, opts) => {
    const service = createServiceAgent({
        server: http.createServer(opts, handler)
    });

    service.logHandler.setLevel(Level.DEBUG)

    return service.server;
};

const fastify = Fastify({ serverFactory });

fastify.get('/', (req, reply) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    void reply.send({ hello: 'world' });
});

void fastify.listen({ port: 0, host: '127.0.0.1' }); 
// Specifying port 0 here will instruct the Server to listen on a random port.  
// Socketnaut will communicate the randomly selected port to the ServiceProxy.