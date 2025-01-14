"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBug = exports.overwriteAssertProductionLogger = exports.getAssertErrMsg = exports.addOnBeforeLogHook = exports.getProjectError = exports.assertInfo = exports.assertWarning = exports.assertUsage = exports.assert = void 0;
const createErrorWithCleanStackTrace_js_1 = require("./createErrorWithCleanStackTrace.js");
const getGlobalObject_js_1 = require("./getGlobalObject.js");
const isObject_js_1 = require("./isObject.js");
const projectInfo_js_1 = require("./projectInfo.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const globalObject = (0, getGlobalObject_js_1.getGlobalObject)('utils/assert.ts', {
    alreadyLogged: new Set(),
    // Production logger. Overwritten by loggerNotProd.ts in non-production environments.
    logger(msg, logType) {
        if (logType === 'info') {
            console.log(msg);
        }
        else {
            console.warn(msg);
        }
    },
    showStackTraceList: new WeakSet()
});
const projectTag = `[${projectInfo_js_1.projectInfo.npmPackageName}]`;
const projectTagWithVersion = `[${projectInfo_js_1.projectInfo.npmPackageName}@${projectInfo_js_1.projectInfo.projectVersion}]`;
const numberOfStackTraceLinesToRemove = 2;
function assert(condition, debugInfo) {
    if (condition)
        return;
    const debugStr = (() => {
        if (!debugInfo) {
            return null;
        }
        const debugInfoSerialized = typeof debugInfo === 'string' ? debugInfo : JSON.stringify(debugInfo);
        return picocolors_1.default.dim(`Debug info (for ${projectInfo_js_1.projectInfo.projectName} maintainers; you can ignore this): ${debugInfoSerialized}`);
    })();
    const link = `${projectInfo_js_1.projectInfo.githubRepository}/issues/new`;
    let errMsg = [
        `You stumbled upon a bug in ${projectInfo_js_1.projectInfo.projectName}'s source code.`,
        `Go to ${picocolors_1.default.blue(link)} and copy-paste this error; a maintainer will fix the bug (usually under 24 hours).`,
        debugStr
    ]
        .filter(Boolean)
        .join(' ');
    errMsg = addWhitespace(errMsg);
    errMsg = addPrefixAssertType(errMsg, 'Bug');
    errMsg = addPrefixProjctName(errMsg, true);
    const internalError = (0, createErrorWithCleanStackTrace_js_1.createErrorWithCleanStackTrace)(errMsg, numberOfStackTraceLinesToRemove);
    globalObject.onBeforeLog?.();
    throw internalError;
}
exports.assert = assert;
function assertUsage(condition, errMsg, { showStackTrace } = {}) {
    if (condition)
        return;
    errMsg = addWhitespace(errMsg);
    errMsg = addPrefixAssertType(errMsg, 'Wrong Usage');
    errMsg = addPrefixProjctName(errMsg);
    const usageError = (0, createErrorWithCleanStackTrace_js_1.createErrorWithCleanStackTrace)(errMsg, numberOfStackTraceLinesToRemove);
    if (showStackTrace) {
        globalObject.showStackTraceList.add(usageError);
    }
    globalObject.onBeforeLog?.();
    throw usageError;
}
exports.assertUsage = assertUsage;
function getProjectError(errMsg) {
    errMsg = addWhitespace(errMsg);
    errMsg = addPrefixAssertType(errMsg, 'Error');
    errMsg = addPrefixProjctName(errMsg);
    const projectError = (0, createErrorWithCleanStackTrace_js_1.createErrorWithCleanStackTrace)(errMsg, numberOfStackTraceLinesToRemove);
    return projectError;
}
exports.getProjectError = getProjectError;
function assertWarning(condition, msg, { onlyOnce, showStackTrace }) {
    if (condition)
        return;
    msg = addWhitespace(msg);
    msg = addPrefixAssertType(msg, 'Warning');
    msg = addPrefixProjctName(msg);
    if (onlyOnce) {
        const { alreadyLogged } = globalObject;
        const key = onlyOnce === true ? msg : onlyOnce;
        if (alreadyLogged.has(key)) {
            return;
        }
        else {
            alreadyLogged.add(key);
        }
    }
    globalObject.onBeforeLog?.();
    if (showStackTrace) {
        const err = new Error(msg);
        globalObject.showStackTraceList.add(err);
        globalObject.logger(err, 'warn');
    }
    else {
        globalObject.logger(msg, 'warn');
    }
}
exports.assertWarning = assertWarning;
function assertInfo(condition, msg, { onlyOnce }) {
    if (condition) {
        return;
    }
    msg = addWhitespace(msg);
    msg = addPrefixProjctName(msg);
    if (onlyOnce) {
        const { alreadyLogged } = globalObject;
        const key = msg;
        if (alreadyLogged.has(key)) {
            return;
        }
        else {
            alreadyLogged.add(key);
        }
    }
    globalObject.onBeforeLog?.();
    globalObject.logger(msg, 'info');
}
exports.assertInfo = assertInfo;
function addOnBeforeLogHook(onBeforeLog) {
    globalObject.onBeforeLog = onBeforeLog;
}
exports.addOnBeforeLogHook = addOnBeforeLogHook;
function addPrefixAssertType(msg, tag) {
    let prefix = `[${tag}]`;
    const color = tag === 'Warning' ? 'yellow' : 'red';
    prefix = picocolors_1.default.bold(picocolors_1.default[color](prefix));
    return `${prefix}${msg}`;
}
function addWhitespace(msg) {
    if (msg.startsWith('[')) {
        return msg;
    }
    else {
        return ` ${msg}`;
    }
}
function addPrefixProjctName(msg, showProjectVersion = false) {
    const prefix = showProjectVersion ? projectTagWithVersion : projectTag;
    return `${prefix}${msg}`;
}
function getAssertErrMsg(thing) {
    let errMsg;
    let errStack = null;
    if (typeof thing === 'string') {
        errMsg = thing;
    }
    else if ((0, isObject_js_1.isObject)(thing) && typeof thing.message === 'string' && typeof thing.stack === 'string') {
        errMsg = thing.message;
        errStack = thing.stack;
    }
    else {
        return null;
    }
    let assertMsg;
    let isBug;
    if (errMsg.startsWith(projectTag)) {
        assertMsg = errMsg.slice(projectTag.length);
        isBug = false;
    }
    else if (errMsg.startsWith(projectTagWithVersion)) {
        assertMsg = errMsg.slice(projectTagWithVersion.length);
        isBug = true;
    }
    else {
        return null;
    }
    // Append stack trace
    if (errStack && (isBug || globalObject.showStackTraceList.has(thing))) {
        assertMsg = `${assertMsg}\n${removeErrMsg(errStack)}`;
    }
    const showVikeVersion = isBug;
    return { assertMsg, showVikeVersion };
}
exports.getAssertErrMsg = getAssertErrMsg;
function removeErrMsg(stack) {
    if (typeof stack !== 'string')
        return String(stack);
    const [firstLine, ...stackLines] = stack.split('\n');
    if (!firstLine.startsWith('Error: '))
        return stack;
    return stackLines.join('\n');
}
function overwriteAssertProductionLogger(logger) {
    globalObject.logger = logger;
}
exports.overwriteAssertProductionLogger = overwriteAssertProductionLogger;
function isBug(err) {
    return !String(err).includes('[Bug]');
}
exports.isBug = isBug;
