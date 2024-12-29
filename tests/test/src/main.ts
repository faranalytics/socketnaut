import * as crypto from 'node:crypto';
import * as https from 'node:https';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as assert from 'node:assert';
import { ChildProcess, fork } from 'node:child_process';
import { once } from 'node:events';
import { after, before, describe, test } from 'node:test';
import { Logger, Formatter, ConsoleHandler, SyslogLevel, SyslogLevelT } from 'streams-logger';
import { dispatch, DispatchResult, listen } from './utils.js';
import { CERT_PATH } from './paths.js';
import { KeysUppercase } from 'streams-logger/dist/commons/types.js';

const arg: Record<string, string> = process.argv.slice(2).reduce((prev: Record<string, string>, curr: string) => ({ ...prev, ...Object.fromEntries([curr.trim().split('=')]) }), {});
const LEVEL = <KeysUppercase<SyslogLevelT>><unknown>(arg['level'] ? arg['level'] : 'WARN');

const logger = new Logger({ name: 'hello-logger', level: SyslogLevel[LEVEL] });
export const formatter = new Formatter({
    format: async ({ level, isotime, hostname, pid, message, }) => (
        `<${level}> ${isotime} ${hostname} ${pid} - ${message}\n`
    )
});
const consoleHandler = new ConsoleHandler({ level: SyslogLevel[LEVEL] });
const log = logger.connect(
    formatter.connect(
        consoleHandler
    )
);

await describe('A suite of tests:', async () => {

    let httpProxy: ChildProcess;
    let httpsProxy: ChildProcess;

    before(async () => {
        log.info('Starting proxies.');
        httpProxy = fork('./dist/http_proxy.js', process.argv.slice(2));
        httpsProxy = fork('./dist/https_proxy.js', process.argv.slice(2));
        await Promise.all([listen(httpProxy, 'ready'), listen(httpsProxy, 'ready')]);
        log.info('Started proxies.');
    });

    after(async () => {
        log.info('Stopping proxies.');
        httpsProxy.send('exit');
        httpProxy.send('exit');
        await Promise.all([once(httpsProxy, 'exit'), once(httpProxy, 'exit')]);
        log.info('Stopped proxies.');
    });

    await describe('1000 request each with a message body of 1e5 bytes:', async () => {

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

    await describe('A 301 redirect:', async () => {

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
});