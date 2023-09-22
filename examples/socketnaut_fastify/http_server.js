import Fastify from 'fastify';
import { createServiceAgent, Level } from 'socketnaut';

const fastify = Fastify();

const agent = createServiceAgent({ server: fastify.server });

agent.log.setLevel(Level.DEBUG)

fastify.get('/', (req, reply) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
    void reply.send({ hello: 'world' });
});

void fastify.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will instruct the Server to listen on a random port.  
// The Socketnaut Agent will communicate the randomly selected port to the ServiceProxy.
