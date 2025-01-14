export { createDebugger };
export { isDebugEnabled };
import { isBrowser } from './isBrowser.js';
import { isCallable } from './isCallable.js';
import { objectAssign } from './objectAssign.js';
import { assert } from './assert.js';
import { checkType } from './checkType.js';
import { getTerminalWidth } from './getTerminWidth.js';
// Avoid this to be loaded in the browser. For isomorphic code: instead of `import { createDebugger } from './utils.js'`, use `globalThis.createDebugger()`.
assert(!isBrowser());
globalThis.__brillout_debug_createDebugger = createDebugger;
function createDebugger(namespace, optionsGlobal) {
    checkType(namespace);
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
    objectAssign(debug, { options: debugWithOptions, isEnabled: isDebugEnabled(namespace) });
    return debug;
}
function isDebugEnabled(namespace) {
    checkType(namespace);
    let DEBUG;
    // - `process` can be undefined in edge workers
    // - We want bundlers to be able to statically replace `process.env.*`
    try {
        DEBUG = process.env.DEBUG;
    }
    catch { }
    return DEBUG?.includes(namespace) ?? false;
}
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
    const terminalWidth = getTerminalWidth();
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
    assert(chunks);
    return chunks;
}
function strUnknown(thing) {
    return typeof thing === 'string' ? thing : strObj(thing);
}
function strObj(obj, newLines = true) {
    return JSON.stringify(obj, replaceFunctionSerializer, newLines ? 2 : undefined);
}
function replaceFunctionSerializer(_key, value) {
    if (isCallable(value)) {
        return value.toString().split(/\s+/).join(' ');
    }
    return value;
}
