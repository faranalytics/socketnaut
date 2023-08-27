/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as http from 'node:http';
import { ServiceServer } from 'socketnaut';

let service = new ServiceServer({
    server: http.createServer()
});

service.server.on('request', (req, res) => {
    res.end('Hello World!');
});

service.server.listen({ port: 0, host: '127.0.0.1' });