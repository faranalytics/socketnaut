"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Level = exports.ServiceAgent = exports.createServiceAgent = exports.ServiceProxy = exports.createServiceProxy = void 0;
const threads = __importStar(require("node:worker_threads"));
const service_agent_js_1 = require("./service_agent.js");
Object.defineProperty(exports, "createServiceAgent", { enumerable: true, get: function () { return service_agent_js_1.createServiceAgent; } });
Object.defineProperty(exports, "ServiceAgent", { enumerable: true, get: function () { return service_agent_js_1.ServiceAgent; } });
const service_proxy_js_1 = require("./service_proxy.js");
Object.defineProperty(exports, "createServiceProxy", { enumerable: true, get: function () { return service_proxy_js_1.createServiceProxy; } });
Object.defineProperty(exports, "ServiceProxy", { enumerable: true, get: function () { return service_proxy_js_1.ServiceProxy; } });
const memoir_1 = require("memoir");
Object.defineProperty(exports, "Level", { enumerable: true, get: function () { return memoir_1.Level; } });
if (threads.isMainThread) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const formatter = (message, { name, level, func, url, line, col }) => `${level}:${new Date().toISOString()}:${name}:${func}:${line}:${col}:${message}`;
    const log = new memoir_1.LevelLogger({ name: 'socketnaut', level: memoir_1.Level.INFO });
    const consoleHandler = new memoir_1.ConsoleHandler();
    const metadataFormatter = new memoir_1.MetadataFormatter({ formatter });
    consoleHandler.setLevel(memoir_1.Level.DEBUG);
    consoleHandler.setFormatter(metadataFormatter);
    log.addHandler(consoleHandler);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
    const { version } = require('../package.json');
    log.info?.(`socketnaut v${version}`);
    log.info?.(`pid ${process.pid}`);
}
