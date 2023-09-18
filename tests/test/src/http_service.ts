import * as http from 'node:http';
import { Level, createServiceAgent } from 'socketnaut';

const service = createServiceAgent({
    server: http.createServer()
});

service.log.setLevel(Level.INFO);

service.server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
    res.end('Test HTTP');
});

service.server.listen({ port: 0, host: '127.0.0.1' });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.