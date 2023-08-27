/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as http from 'node:http';
import { Service } from 'socketnaut';

let service = new Service({
    server: http.createServer()
});

service.server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
    console.log('Server request.')
    res.end('TEST');
});