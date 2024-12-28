import { ChildProcess, fork } from 'node:child_process';
import { once } from 'node:events';
import { after, before, describe, test } from 'node:test';
import { Logger, Formatter, ConsoleHandler, SyslogLevel, SyslogLevelT } from 'streams-logger';
import * as crypto from 'node:crypto';
import * as https from 'node:https';
import * as fs from 'node:fs';
import * as assert from 'node:assert';
import { dispatch, listen } from './utils.js';
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

await describe('A suite of tests.', async () => {

    let httpProxy: ChildProcess;
    let httpsProxy: ChildProcess;

    before(async () => {
        log.info('Starting 2 HTTP proxies and 100 HTTPS proxies.');
        httpProxy = fork('./dist/http_proxy.js', process.argv.slice(2));
        httpsProxy = fork('./dist/https_proxy.js', process.argv.slice(2));
        await Promise.all([listen(httpProxy, 'ready'), listen(httpsProxy, 'ready')]);
        log.info('Started 2 HTTP proxies and 100 HTTPS proxies.');
    });

    after(async () => {
        log.info('Stopping 2 HTTP proxies and 100 HTTPS proxies.');
        httpsProxy.send('exit');
        httpProxy.send('exit');
        await Promise.all([once(httpsProxy, 'exit'), once(httpProxy, 'exit')]);
        log.info('Stopped 2 HTTP proxies and 100 HTTPS proxies.');
    });

    void test('Make 1000 requests each with a message body of 100,000 bytes.', async (t) => {
        const data = crypto.randomBytes(1e5);
        const promises: Array<Promise<unknown>> = [];
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
        const results = await Promise.allSettled(promises);

        void t.test('Test the integrity of the echoed data.', (t) => {
            let errorCount = 0;
            for (const result of results) {
                if (result.status == 'rejected') {
                    errorCount = errorCount + 1;
                }
                if (result.status == 'fulfilled') {
                    assert.strictEqual((result.value as Buffer).toString(), data.toString());
                }
            }
            void t.test('Test for errors.', () => {
                assert.strictEqual(errorCount, 0);
            });
        });
    });
});