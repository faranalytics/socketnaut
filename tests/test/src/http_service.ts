import * as http from 'node:http';
import { SyslogLevel, createServiceAgent } from 'socketnaut';
import { SyslogLevelT } from 'streams-logger';
import { KeysUppercase } from 'streams-logger/dist/commons/types.js';

const arg: Record<string, string> = process.argv.slice(2).reduce((prev: Record<string, string>, curr: string) => ({ ...prev, ...Object.fromEntries([curr.trim().split('=')]) }), {});
const LEVEL = <KeysUppercase<SyslogLevelT>><unknown>arg['level'];

const agent = createServiceAgent({
    server: http.createServer()
});

agent.log.setLevel(SyslogLevel[LEVEL]);

agent.server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.url) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        res.writeHead(301, { 'location': `https://${url.hostname}:3443${url.pathname}` }).end();
    }
});

agent.server.listen({ port: 0, host: 'localhost' });
// Specifying port 0 here will cause the Server to listen on a random port.
// Socketnaut will communicate the random port number to the ServiceProxy.