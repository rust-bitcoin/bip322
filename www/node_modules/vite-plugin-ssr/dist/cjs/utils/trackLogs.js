"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_js_1 = require("./debug.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const assertIsNotBrowser_js_1 = require("./assertIsNotBrowser.js");
(0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
if ((0, debug_js_1.isDebugEnabled)('vps:log')) {
    trackLogs();
}
// https://stackoverflow.com/questions/45395369/how-to-get-console-log-line-numbers-shown-in-nodejs/75109905#75109905
function trackLogs() {
    const logOriginal = process.stdout.write;
    // @ts-ignore
    const log = (msg) => logOriginal.call(process.stdout, msg + '\n');
    ['stdout', 'stderr'].forEach((stdName) => {
        // @ts-ignore
        var methodOriginal = process[stdName].write;
        // @ts-ignore
        process[stdName].write = function (...args) {
            log(picocolors_1.default.bold(picocolors_1.default.blue('*** LOG ***')));
            // @ts-ignore
            methodOriginal.apply(process[stdName], args);
            // @ts-ignore
            log(new Error().stack.replace(/^Error(\:|)/, picocolors_1.default.magenta('*** LOG ORIGIN ***')));
        };
    });
    Error.stackTraceLimit = Infinity;
}
