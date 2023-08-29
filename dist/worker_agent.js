"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerAgent = void 0;
const port_agent_1 = require("port_agent");
class WorkerAgent extends port_agent_1.Agent {
    worker;
    connections;
    socketConnectOpts;
    online;
    constructor({ worker, }) {
        super(worker);
        this.worker = worker;
        this.connections = 0;
        this.online = new Promise((r, j) => {
            worker.once('exit', j);
            worker.once('error', j);
            worker.once('online', async () => {
                const socketConnectOpts = await this.call('socketConnectOpts');
                if (socketConnectOpts) {
                    this.socketConnectOpts = socketConnectOpts;
                }
                else {
                    j("The Worker came online; however, it is missing a socketConnectOpts.");
                }
                r(socketConnectOpts);
                worker.removeListener('exit', j);
                worker.removeListener('error', j);
            });
        });
    }
}
exports.WorkerAgent = WorkerAgent;
