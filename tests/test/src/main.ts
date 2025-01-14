import * as crypto from 'node:crypto';
import * as https from 'node:https';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as assert from 'node:assert';
import * as net from 'node:net';
import { createService } from 'network-services';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { after, before, describe, test } from 'node:test';
import { Logger, Formatter, ConsoleHandler, SyslogLevel } from 'streams-logger';
import { ProxyController } from './proxies.js';
import { dispatch, DispatchResult } from './utils.js';
import { CERT_PATH } from './paths.js';

const logger = new Logger({ name: 'hello-logger', level: SyslogLevel.INFO });
export const formatter = new Formatter({
    format: async ({ level, isotime, hostname, pid, message, }) => (
        `<${level}> ${isotime} ${hostname} ${pid} - ${message}\n`
    )
});
const consoleHandler = new ConsoleHandler({ level: SyslogLevel.INFO });
const log = logger.connect(
    formatter.connect(
        consoleHandler
    )
);

log.warn('Binding to ports 3000, 3080, and 3443 on localhost.');

log.info('Starting Service Proxies.');
const httpsProxyChildProcess = fork('./dist/proxies.js', process.argv.slice(2));
await once(httpsProxyChildProcess, 'message');
log.info('Started Service Proxies.');

log.info('Connecting to Proxy Controller.');
const socket = net.connect({ port: 3000, host: '127.0.0.1' });
socket.on('error', console.error);
const service = createService(socket);
const controller = service.createServiceAPI<ProxyController>();
log.info('Connected to Proxy Controller.');

socket.on('ready', async () => {

    await describe('A suite of tests:', async () => {

        before(async () => {
            log.info('Running tests.');
        });

        after(async () => {
            log.info('Shutting down controller.');
            socket.destroy();
            log.info('Finished tests.');
        });

        await describe('Make 1000 requests, each with a message body of 1e5 bytes:', async () => {

            const data = crypto.randomBytes(1e5);
            const promises: Array<Promise<DispatchResult>> = [];
            for (let i = 0; i < 1e3; i++) {
                const req = https.request(
                    {
                        hostname: 'localhost',
                        port: 3443,
                        path: '/',
                        method: 'POST',
                        ca: [fs.readFileSync(CERT_PATH)],
                        timeout: 1e6,
                        headers: { 'content-length': data.length }
                    });

                promises.push(dispatch(req, data));
            }
            const results = await Promise.allSettled<Promise<DispatchResult>>(promises);

            await test('The data in the response body should equal the data in the request body.', async (t) => {

                let errorCount = 0;
                for (const result of results) {
                    if (result.status == 'rejected') {
                        errorCount = errorCount + 1;
                        log.error(result.reason);
                    }
                    if (result.status == 'fulfilled') {
                        assert.strictEqual((result.value.body).toString(), data.toString());
                    }
                }
                await t.test('Test for errors.', () => {
                    assert.strictEqual(errorCount, 0);
                });
            });
        });

        await describe('Perform a 301 redirect:', async () => {

            const data = crypto.randomBytes(1e5);

            await test('The response status code of the HTTP request should equal 301.', async () => {

                const clientRequest = http.request(
                    {
                        hostname: 'localhost',
                        port: 3080,
                        path: '/',
                        method: 'POST',
                        timeout: 1e6,
                        headers: { 'content-length': data.length }
                    });

                const { incomingMessage } = await dispatch(clientRequest, data);

                assert.strictEqual(incomingMessage.statusCode, 301);
            });

            await test('The response code of the HTTPS request should equal 200.', async (t) => {

                const clientRequest = https.request(
                    {
                        hostname: 'localhost',
                        port: 3443,
                        path: '/',
                        method: 'POST',
                        ca: [fs.readFileSync(CERT_PATH)],
                        timeout: 1e6,
                        headers: { 'content-length': data.length }
                    });

                const { incomingMessage, body } = await dispatch(clientRequest, data);

                assert.strictEqual(incomingMessage.statusCode, 200);

                await t.test('The data in the response body should equal the data in the request body.', () => {

                    assert.strictEqual(body.toString(), data.toString());
                });
            });
        });

        await describe('Destroy a conection.', async () => {

            await test('The Service Proxy servers should be listening after an Error.', async () => {

                const data = crypto.randomBytes(1e6);

                const clientRequest = https.request(
                    {
                        hostname: 'localhost',
                        port: 3443,
                        path: '/',
                        method: 'POST',
                        ca: [fs.readFileSync(CERT_PATH)],
                        timeout: 1e6,
                        headers: { 'content-length': data.length }
                    });

                clientRequest.end(data);

                clientRequest.destroy();

                await once(clientRequest, 'error');

                assert.strictEqual(await controller.getListening(), true);
            });
        });

        await describe('Perform a graceful shutdown.', async () => {

            await test('Shutting down the ServiceProxy for the HTTP service should not throw.', async () => {
                await assert.doesNotReject(controller.httpServiceProxy.shutdown());
            });

            await test('Shutting down the ServiceProxy for the HTTPS service should not throw.', async () => {
                await assert.doesNotReject(controller.httpsServiceProxy.shutdown());
            });
        });
    });
});

