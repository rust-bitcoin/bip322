"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDebugEnabled = exports.createDebugger = void 0;
const isBrowser_js_1 = require("./isBrowser.js");
const isCallable_js_1 = require("./isCallable.js");
const objectAssign_js_1 = require("./objectAssign.js");
const assert_js_1 = require("./assert.js");
const checkType_js_1 = require("./checkType.js");
const getTerminWidth_js_1 = require("./getTerminWidth.js");
// Avoid this to be loaded in the browser. For isomorphic code: instead of `import { createDebugger } from './utils.js'`, use `globalThis.createDebugger()`.
(0, assert_js_1.assert)(!(0, isBrowser_js_1.isBrowser)());
globalThis.__brillout_debug_createDebugger = createDebugger;
function createDebugger(namespace, optionsGlobal) {
    (0, checkType_js_1.checkType)(namespace);
    const debugWithOptions = (options) => {
        return (...msgs) => {
            if (!isDebugEnabled(namespace))
                return;
            let [msgFirst, ...msgsRest] = msgs;
            const padding = ' '.repeat(namespace.length + 1);
            const optionsResolved = { ...optionsGlobal, ...options };
            msgFirst = formatMsg(msgFirst, optionsResolved, padding, 'FIRST');
            msgsRest = msgsRest.map((msg, i) => {
                const position = i === msgsRest.length - 1 ? 'LAST' : 'MIDDLE';
                return formatMsg(msg, optionsResolved, padding, position);
            });
            console.log('\x1b[1m%s\x1b[0m', namespace, msgFirst);
            msgsRest.forEach((msg) => {
                console.log(msg);
            });
        };
    };
    const debug = (...msgs) => debugWithOptions({})(...msgs);
    (0, objectAssign_js_1.objectAssign)(debug, { options: debugWithOptions, isEnabled: isDebugEnabled(namespace) });
    return debug;
}
exports.createDebugger = createDebugger;
function isDebugEnabled(namespace) {
    (0, checkType_js_1.checkType)(namespace);
    let DEBUG;
    // - `process` can be undefined in edge workers
    // - We want bundlers to be able to statically replace `process.env.*`
    try {
        DEBUG = process.env.DEBUG;
    }
    catch { }
    return DEBUG?.includes(namespace) ?? false;
}
exports.isDebugEnabled = isDebugEnabled;
function formatMsg(info, options, padding, position) {
    if (info === undefined) {
        return undefined;
    }
    let str = position === 'FIRST' ? '' : padding;
    if (typeof info === 'string') {
        str += info;
    }
    else if (Array.isArray(info)) {
        if (info.length === 0) {
            str += options.serialization?.emptyArray ?? '[]';
        }
        else {
            str += info.map(strUnknown).join('\n');
        }
    }
    else {
        str += strUnknown(info);
    }
    str = pad(str, padding);
    if (position !== 'LAST' && position !== 'FIRST') {
        str += '\n';
    }
    return str;
}
function pad(str, padding) {
    const terminalWidth = (0, getTerminWidth_js_1.getTerminalWidth)();
    const lines = [];
    str.split('\n').forEach((line) => {
        if (!terminalWidth) {
            lines.push(line);
        }
        else {
            chunk(line, terminalWidth - padding.length).forEach((chunk) => {
                lines.push(chunk);
            });
        }
    });
    return lines.join('\n' + padding);
}
function chunk(str, size) {
    if (str.length <= size) {
        return [str];
    }
    const chunks = str.match(new RegExp('.{1,' + size + '}', 'g'));
    (0, assert_js_1.assert)(chunks);
    return chunks;
}
function strUnknown(thing) {
    return typeof thing === 'string' ? thing : strObj(thing);
}
function strObj(obj, newLines = true) {
    return JSON.stringify(obj, replaceFunctionSerializer, newLines ? 2 : undefined);
}
function replaceFunctionSerializer(_key, value) {
    if ((0, isCallable_js_1.isCallable)(value)) {
        return value.toString().split(/\s+/).join(' ');
    }
    return value;
}
