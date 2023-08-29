"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatter = exports.consoleHandler = exports.log = exports.Level = exports.ServiceMessageHandler = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
const memoir_1 = require("memoir");
Object.defineProperty(exports, "Level", { enumerable: true, get: function () { return memoir_1.Level; } });
class ServiceMessageHandler extends memoir_1.LevelHandler {
    formatter;
    agent;
    constructor(agent) {
        super();
        this.handle = this.handle.bind(this);
        this.setFormatter = this.setFormatter.bind(this);
        this.setLevel = this.setLevel.bind(this);
        this.agent = agent;
    }
    async handle(message, meta) {
        if (meta.level && meta.level >= this.level) {
            if (this.formatter) {
                const formattedMessage = this.formatter.format(message, meta);
                await this.agent.call('serviceLog', { level: memoir_1.Level[meta.level], value: formattedMessage });
            }
        }
    }
}
exports.ServiceMessageHandler = ServiceMessageHandler;
exports.log = new memoir_1.LevelLogger({ name: 'socketnaut' });
exports.consoleHandler = new memoir_1.ConsoleHandler();
exports.formatter = new memoir_1.MetaFormatter((message, { name, level, func, url, line, col }) => `${memoir_1.Level[level]}:${new Date().toISOString()}:${name}:${func}:${line}:${col}:${message}`);
try {
    exports.consoleHandler.setLevel(memoir_1.Level.INFO);
    exports.consoleHandler.setFormatter(exports.formatter);
    exports.log.addHandler(exports.consoleHandler);
}
catch (err) {
    console.error(err);
}
