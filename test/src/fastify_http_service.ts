/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as http from 'node:http';
import { Service } from 'socketnaut';
import Fastify from 'fastify'

const serverFactory = (handler: any, opts: any) => {
    let service = new Service({
        server: http.createServer((req, res) => { 
            handler(req, res) 
        })
    });

    return service.server
}

const fastify = Fastify({ serverFactory });

fastify.post('/blocking-request', (req, reply) => {
    for (let now = Date.now(), then = now + 100; now < then; now = Date.now());
    reply.send({ hello: 'world' });
});

fastify.listen({ port: 0, host: '127.0.0.1' });