export { assert };
export { assertUsage };
export { assertWarning };
export { assertInfo };
export { getProjectError };
export { addOnBeforeLogHook };
export { getAssertErrMsg };
export { overwriteAssertProductionLogger };
export { isBug };
import { createErrorWithCleanStackTrace } from './createErrorWithCleanStackTrace.js';
import { getGlobalObject } from './getGlobalObject.js';
import { isObject } from './isObject.js';
import { projectInfo } from './projectInfo.js';
import pc from '@brillout/picocolors';
const globalObject = getGlobalObject('utils/assert.ts', {
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
const projectTag = `[${projectInfo.npmPackageName}]`;
const projectTagWithVersion = `[${projectInfo.npmPackageName}@${projectInfo.projectVersion}]`;
const numberOfStackTraceLinesToRemove = 2;
function assert(condition, debugInfo) {
    if (condition)
        return;
    const debugStr = (() => {
        if (!debugInfo) {
            return null;
        }
        const debugInfoSerialized = typeof debugInfo === 'string' ? debugInfo : JSON.stringify(debugInfo);
        return pc.dim(`Debug info (for ${projectInfo.projectName} maintainers; you can ignore this): ${debugInfoSerialized}`);
    })();
    const link = `${projectInfo.githubRepository}/issues/new`;
    let errMsg = [
        `You stumbled upon a bug in ${projectInfo.projectName}'s source code.`,
        `Go to ${pc.blue(link)} and copy-paste this error; a maintainer will fix the bug (usually under 24 hours).`,
        debugStr
    ]
        .filter(Boolean)
        .join(' ');
    errMsg = addWhitespace(errMsg);
    errMsg = addPrefixAssertType(errMsg, 'Bug');
    errMsg = addPrefixProjctName(errMsg, true);
    const internalError = createErrorWithCleanStackTrace(errMsg, numberOfStackTraceLinesToRemove);
    globalObject.onBeforeLog?.();
    throw internalError;
}
function assertUsage(condition, errMsg, { showStackTrace } = {}) {
    if (condition)
        return;
    errMsg = addWhitespace(errMsg);
    errMsg = addPrefixAssertType(errMsg, 'Wrong Usage');
    errMsg = addPrefixProjctName(errMsg);
    const usageError = createErrorWithCleanStackTrace(errMsg, numberOfStackTraceLinesToRemove);
    if (showStackTrace) {
        globalObject.showStackTraceList.add(usageError);
    }
    globalObject.onBeforeLog?.();
    throw usageError;
}
function getProjectError(errMsg) {
    errMsg = addWhitespace(errMsg);
    errMsg = addPrefixAssertType(errMsg, 'Error');
    errMsg = addPrefixProjctName(errMsg);
    const projectError = createErrorWithCleanStackTrace(errMsg, numberOfStackTraceLinesToRemove);
    return projectError;
}
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
function addOnBeforeLogHook(onBeforeLog) {
    globalObject.onBeforeLog = onBeforeLog;
}
function addPrefixAssertType(msg, tag) {
    let prefix = `[${tag}]`;
    const color = tag === 'Warning' ? 'yellow' : 'red';
    prefix = pc.bold(pc[color](prefix));
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
    else if (isObject(thing) && typeof thing.message === 'string' && typeof thing.stack === 'string') {
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
function isBug(err) {
    return !String(err).includes('[Bug]');
}
