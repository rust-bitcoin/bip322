"use strict";
// Prettify transpilation errors
//  - Doesn't work for optimize errors: https://gist.github.com/brillout/9b7bb78ae866558b292ea1b516a986ec
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrettyErrMessage = exports.isEquivalentErrorWithCodeSnippet = exports.isErrorWithCodeSnippet = exports.getPrettyErrorWithCodeSnippet = void 0;
// Copied & adapted from https://github.com/vitejs/vite/blob/9c114c5c72a6af87e3330d5573362554b4511265/packages/vite/src/node/server/middlewares/error.ts
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const utils_js_1 = require("../../utils.js");
function isErrorWithCodeSnippet(err) {
    if (!(0, utils_js_1.isObject)(err)) {
        return false;
    }
    const { id, frame, message } = err;
    if (typeof id !== 'string' || !id.trim()) {
        return false;
    }
    if (typeof frame === 'string' && frame.trim()) {
        return true;
    }
    if (typeof message === 'string' && containsCodeSnippet(message)) {
        return true;
    }
    return false;
}
exports.isErrorWithCodeSnippet = isErrorWithCodeSnippet;
function getPrettyErrorWithCodeSnippet(err, userRootDir) {
    /* Uncomment to inspect and/or create fixture for ./errorWithCodeSnippet.spec.ts
    console.log('userRootDir', userRootDir)
    console.log('err.message', err.message)
    console.log('err.stack', (err as any).stack)
    console.log('err.pluginCode', (err as any).pluginCode)
    console.log('Object.keys(err)', Object.keys(err))
    console.log('err', err)
    // For copy-pasting errors while preserving terminal ANSI colors
    console.log(
      'JSON.stringify(err)',
      JSON.stringify({
        ...err,
        message: err.message,
        stack: (err as any).stack
      })
    )
    //*/
    (0, utils_js_1.assert)(isErrorWithCodeSnippet(err));
    let { id, frame } = err;
    const msgFirstLine = [
        picocolors_1.default.red('Failed to transpile'),
        picocolors_1.default.bold(picocolors_1.default.red((0, utils_js_1.getFilePathVite)(normalizeId(id), userRootDir))),
        picocolors_1.default.red('because:')
    ].join(' ');
    const errMsg = getPrettyErrMessage(err);
    if (errMsg && containsCodeSnippet(errMsg)) {
        // Conditionally swallowing frame is a risky move but worth it thanks to logErrorDebugNote()
        // We swallow frame because many tools set 'error.frame' to something rubbish, for example:
        //  - @vitejs/plugin-vue
        //  - @vitejs/plugin-react-swc
        //  - @mdx-js/rollup
        frame = undefined;
    }
    else {
        (0, utils_js_1.assert)(frame);
        frame = frame.trim();
        (0, utils_js_1.assert)(frame);
        frame = picocolors_1.default.yellow(frame);
    }
    let msg = [msgFirstLine, errMsg, frame].filter(Boolean).join('\n');
    msg = (0, utils_js_1.removeEmptyLines)(msg);
    /* Vite already does a fairly good job at showing a concise error in the layover
    server.ws.send({
      type: 'error',
      err: msg
    })
    */
    return msg;
}
exports.getPrettyErrorWithCodeSnippet = getPrettyErrorWithCodeSnippet;
function getPrettyErrMessage(err) {
    const { id, frame } = err;
    let errMsg = err.message;
    if (!errMsg || !errMsg.trim())
        return null;
    const trail = /(?:\:|)(?:\s|$)/;
    // Remove "Transform failed with 1 error:" (redundant since we already print an intro message)
    errMsg = errMsg.split(reg([/Transform failed with \d* error(?:s|)/, trail], 'gi')).join('');
    // Remove "/home/rom/code/vite-plugin-ssr/examples/react-full-v1/components/Counter.tsx:1:8:" (redundant since we already print the filename)
    const pos = /(?:\:\d+|)/;
    errMsg = errMsg.split(reg([id, pos, pos, trail], 'gi')).join('');
    errMsg = errMsg.split(reg([normalizeId(id), pos, pos, trail], 'gi')).join('');
    // Remove "ERROR:" (useless)
    errMsg = errMsg.split(reg(['ERROR:', trail])).join('');
    // Remove "Internal server error:" (useless)
    errMsg = errMsg.split(reg(['Internal server error', trail])).join('');
    if (containsCodeSnippet(errMsg)) {
        errMsg = removeStandaloneCodePosition(errMsg);
    }
    errMsg = errMsg.trim();
    if (frame && frame.includes(errMsg))
        errMsg = '';
    return errMsg;
}
exports.getPrettyErrMessage = getPrettyErrMessage;
function containsCodeSnippet(str) {
    str = (0, utils_js_1.stripAnsi)(str);
    let codeBlockSize = 0;
    for (const line of str.split('\n')) {
        if (!isCodeSnippetLine(line)) {
            codeBlockSize = 0;
        }
        else {
            codeBlockSize++;
        }
        if (codeBlockSize >= 3) {
            return true;
        }
    }
    return false;
}
function isCodeSnippetLine(line) {
    // Babel
    if (/[\s\d>]*\|/.test(line))
        return true;
    // SWC
    if (/[\s\d>]*(╭─|│|·)/.test(line))
        return true;
    return false;
}
function reg(parts, flags = '') {
    return new RegExp(parts.map((part) => (typeof part === 'string' ? (0, utils_js_1.escapeRegex)(part) : part.source)).join(''), flags);
}
function removeStandaloneCodePosition(errMsg) {
    // Remove weird standalone code position " (2:7) "
    errMsg = errMsg
        .split('\n')
        .map((line) => {
        const posRE = /(\s|^)\(\d+:\d+\)(\s|$)/;
        (0, utils_js_1.assert)(posRE.test(' (1:2)'));
        (0, utils_js_1.assert)(posRE.test('(13:42) '));
        if (!isCodeSnippetLine(line)) {
            line = line.split(posRE).join('');
        }
        return line;
    })
        .join('\n');
    return errMsg;
}
function isEquivalentErrorWithCodeSnippet(err1, err2) {
    if (!(0, utils_js_1.isObject)(err1) || !(0, utils_js_1.isObject)(err2))
        return false;
    if (isDefinedAndSame(err1.message, err2.message) &&
        isDefinedAndSame(err1.frame, err2.frame) &&
        isDefinedAndSame(err1.id, err2.id)) {
        return true;
    }
    return false;
}
exports.isEquivalentErrorWithCodeSnippet = isEquivalentErrorWithCodeSnippet;
function isDefinedAndSame(val1, val2) {
    return val1 && val1 === val2;
}
function normalizeId(id) {
    id = (0, utils_js_1.toPosixPath)(id);
    // remove query
    id = id.split('?')[0];
    return id;
}
