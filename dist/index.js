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
exports.Level = exports.formatter = exports.consoleHandler = exports.socketlog = exports.ServiceAgent = exports.createServiceAgent = exports.ServiceProxy = exports.createServiceProxy = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */
const threads = __importStar(require("node:worker_threads"));
const service_agent_js_1 = require("./service_agent.js");
Object.defineProperty(exports, "createServiceAgent", { enumerable: true, get: function () { return service_agent_js_1.createServiceAgent; } });
Object.defineProperty(exports, "ServiceAgent", { enumerable: true, get: function () { return service_agent_js_1.ServiceAgent; } });
const service_proxy_js_1 = require("./service_proxy.js");
Object.defineProperty(exports, "createServiceProxy", { enumerable: true, get: function () { return service_proxy_js_1.createServiceProxy; } });
Object.defineProperty(exports, "ServiceProxy", { enumerable: true, get: function () { return service_proxy_js_1.ServiceProxy; } });
const logging_js_1 = require("./logging.js");
Object.defineProperty(exports, "socketlog", { enumerable: true, get: function () { return logging_js_1.log; } });
Object.defineProperty(exports, "consoleHandler", { enumerable: true, get: function () { return logging_js_1.consoleHandler; } });
Object.defineProperty(exports, "formatter", { enumerable: true, get: function () { return logging_js_1.formatter; } });
Object.defineProperty(exports, "Level", { enumerable: true, get: function () { return logging_js_1.Level; } });
if (threads.isMainThread) {
    const { version } = require('../package.json');
    logging_js_1.log.info(`socketnaut v${version}`);
    logging_js_1.log.info(`pid ${process.pid}`);
}
