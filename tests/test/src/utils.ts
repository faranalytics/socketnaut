import * as http from 'node:http';
import { once } from 'node:events';
import { ChildProcess } from 'node:child_process';

export async function dispatch(req: http.ClientRequest, data: string | Buffer) {
    req.end(data);
    const [res] = await once(req, 'response');
    const chunks: Array<Buffer> = [];
    res.on('data', (datum: Buffer) => {
        chunks.push(datum);
    });
    await once(res, 'end');
    return Buffer.concat(chunks);
}

export async function listen(process: ChildProcess | NodeJS.Process, message: string) {
    while (JSON.stringify((await once(process, 'message'))[0]) != JSON.stringify(message));
}