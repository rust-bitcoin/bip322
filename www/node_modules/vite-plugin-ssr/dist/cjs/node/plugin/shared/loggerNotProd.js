"use strict";
// Non-production logger used for:
//  - Development
//  - Preview
//  - Build
//  - Pre-rendering
// In other words: everywhere except in production
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearLogs = exports.logErrorDebugNote = exports.logConfigErrorRecover = exports.logConfigError = exports.logConfigInfo = exports.logViteErrorContainingCodeSnippet = exports.logViteAny = void 0;
const abort_js_1 = require("../../../shared/route/abort.js");
const globalContext_js_1 = require("../../runtime/globalContext.js");
const loggerRuntime_js_1 = require("../../runtime/renderPage/loggerRuntime.js");
const utils_js_1 = require("../utils.js");
const getHttpRequestAsyncStore_js_1 = require("./getHttpRequestAsyncStore.js");
const isErrorDebug_js_1 = require("./isErrorDebug.js");
const errorWithCodeSnippet_js_1 = require("./loggerNotProd/errorWithCodeSnippet.js");
const transpileAndExecuteFile_js_1 = require("../plugins/importUserCode/v1-design/transpileAndExecuteFile.js");
const log_js_1 = require("./loggerNotProd/log.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const isNewError_js_1 = require("../../runtime/renderPage/isNewError.js");
const isConfigInvalid_js_1 = require("../../runtime/renderPage/isConfigInvalid.js");
(0, utils_js_1.assertIsNotProductionRuntime)();
(0, loggerRuntime_js_1.overwriteRuntimeProductionLogger)(logRuntimeError, logRuntimeInfo);
(0, utils_js_1.overwriteAssertProductionLogger)(assertLogger);
function logRuntimeInfo(msg, httpRequestId, logType, clearErrors) {
    if (clearErrors)
        clearLogs({ clearErrors: true });
    const category = getCategory(httpRequestId);
    (0, utils_js_1.assert)(category);
    (0, log_js_1.logWithVikeTag)(msg, logType, category);
}
function logViteAny(msg, logType, httpRequestId, prependViteTag) {
    if (prependViteTag) {
        const category = getCategory(httpRequestId);
        (0, log_js_1.logWithViteTag)(msg, logType, category);
    }
    else {
        (0, log_js_1.logDirectly)(msg, logType);
    }
}
exports.logViteAny = logViteAny;
function logConfigInfo(msg, logType) {
    const category = getConfigCategory();
    (0, log_js_1.logWithVikeTag)(msg, logType, category);
}
exports.logConfigInfo = logConfigInfo;
function logConfigErrorRecover() {
    const msg = picocolors_1.default.bold(picocolors_1.default.green('Configuration successfully loaded'));
    clearLogs({ clearAlsoIfConfigIsInvalid: true });
    const category = getConfigCategory();
    (0, log_js_1.logWithVikeTag)(msg, 'error-recover', category);
}
exports.logConfigErrorRecover = logConfigErrorRecover;
function logRuntimeError(err, 
/** `httpRequestId` is `null` when pre-rendering */
httpRequestId) {
    logErr(err, httpRequestId);
}
function logViteErrorContainingCodeSnippet(err) {
    logErr(err);
}
exports.logViteErrorContainingCodeSnippet = logViteErrorContainingCodeSnippet;
function logErr(err, httpRequestId = null) {
    (0, utils_js_1.warnIfErrorIsNotObject)(err);
    if ((0, abort_js_1.isAbortError)(err) && !(0, isErrorDebug_js_1.isErrorDebug)()) {
        return;
    }
    const store = (0, getHttpRequestAsyncStore_js_1.getHttpRequestAsyncStore)();
    (0, isNewError_js_1.setAlreadyLogged)(err);
    if ((0, getHttpRequestAsyncStore_js_1.getHttpRequestAsyncStore)()?.shouldErrorBeSwallowed(err)) {
        if (!(0, isErrorDebug_js_1.isErrorDebug)())
            return;
    }
    else {
        store?.markErrorAsLogged(err);
    }
    const category = getCategory(httpRequestId);
    if (!(0, isErrorDebug_js_1.isErrorDebug)()) {
        if ((0, errorWithCodeSnippet_js_1.isErrorWithCodeSnippet)(err)) {
            // We handle transpile errors globally because wrapping viteDevServer.ssrLoadModule() wouldn't be enough: transpile errors can be thrown not only when calling viteDevServer.ssrLoadModule() but also later when loading user code with import() (since Vite lazy-transpiles import() calls)
            const viteConfig = (0, globalContext_js_1.getViteConfig)();
            (0, utils_js_1.assert)(viteConfig);
            let prettyErr = (0, errorWithCodeSnippet_js_1.getPrettyErrorWithCodeSnippet)(err, viteConfig.root);
            (0, utils_js_1.assert)((0, utils_js_1.stripAnsi)(prettyErr).startsWith('Failed to transpile'));
            (0, log_js_1.logWithViteTag)(prettyErr, 'error', category);
            logErrorDebugNote();
            return;
        }
        {
            const logged = handleAssertMsg(err, category);
            if (logged)
                return;
        }
    }
    // Needs to be after assertion messages handling, because user hooks may throw an assertion error
    const hook = (0, utils_js_1.isUserHookError)(err);
    if (hook) {
        const { hookName, hookFilePath } = hook;
        (0, log_js_1.logWithVikeTag)(picocolors_1.default.red(`Following error was thrown by the ${hookName}() hook defined at ${hookFilePath}`), 'error', category);
    }
    else if (category) {
        logFallbackErrIntro(category);
    }
    (0, log_js_1.logDirectly)(err, 'error');
}
function logConfigError(err) {
    clearLogs({ clearAlsoIfConfigIsInvalid: true });
    (0, utils_js_1.warnIfErrorIsNotObject)(err);
    const category = getConfigCategory();
    {
        const errIntroMsg = (0, transpileAndExecuteFile_js_1.getConfigExececutionErrorIntroMsg)(err);
        if (errIntroMsg) {
            (0, utils_js_1.assert)((0, utils_js_1.stripAnsi)(errIntroMsg).startsWith('Failed to execute'));
            (0, log_js_1.logWithVikeTag)(errIntroMsg, 'error', category);
            (0, log_js_1.logDirectly)(err, 'error');
            return;
        }
    }
    {
        const errMsgFormatted = (0, transpileAndExecuteFile_js_1.getConfigBuildErrorFormatted)(err);
        if (errMsgFormatted) {
            (0, utils_js_1.assert)((0, utils_js_1.stripAnsi)(errMsgFormatted).startsWith('Failed to transpile'));
            if (!(0, isErrorDebug_js_1.isErrorDebug)()) {
                (0, log_js_1.logWithVikeTag)(errMsgFormatted, 'error', category);
            }
            else {
                (0, log_js_1.logDirectly)(err, 'error');
            }
            return;
        }
    }
    {
        const logged = handleAssertMsg(err, category);
        if (logged)
            return;
    }
    if (category)
        logFallbackErrIntro(category);
    (0, log_js_1.logDirectly)(err, 'error');
}
exports.logConfigError = logConfigError;
function logFallbackErrIntro(category) {
    (0, log_js_1.logWithVikeTag)(picocolors_1.default.bold(picocolors_1.default.red('[Error] An error was thrown:')), 'error', category);
}
function getConfigCategory() {
    const category = getCategory() ?? 'config';
    return category;
}
function handleAssertMsg(err, category) {
    const res = (0, utils_js_1.getAssertErrMsg)(err);
    if (!res)
        return false;
    const { assertMsg, showVikeVersion } = res;
    (0, log_js_1.logWithVikeTag)(assertMsg, 'error', category, showVikeVersion);
    return true;
}
function assertLogger(thing, logType) {
    const category = getCategory();
    const res = (0, utils_js_1.getAssertErrMsg)(thing);
    /* Risk of infinite loop
    assert(res)
    */
    if (!res)
        throw new Error('Internal error, reach out to a maintainer');
    const { assertMsg, showVikeVersion } = res;
    (0, log_js_1.logWithVikeTag)(assertMsg, logType, category, showVikeVersion);
}
function clearLogs(conditions = {}) {
    if (!conditions.clearAlsoIfConfigIsInvalid && isConfigInvalid_js_1.isConfigInvalid) {
        // Avoid hiding the config error: the config error is printed only once
        return;
    }
    if (conditions.clearErrors && !log_js_1.screenHasErrors) {
        return;
    }
    if (conditions.clearIfFirstLog && !log_js_1.isFirstLog) {
        return;
    }
    const viteConfig = (0, globalContext_js_1.getViteConfig)();
    if (viteConfig) {
        (0, log_js_1.clearScreen)(viteConfig);
    }
}
exports.clearLogs = clearLogs;
/** Note shown to user when vite-plugin-ssr does something risky:
 *  - When vite-plugin-ssr dedupes (i.e. swallows) an error with getHttpRequestAsyncStore().shouldErrorBeSwallowed(err)
 *  - When vite-plugin-ssr modifies the error with getPrettyErrorWithCodeSnippet(err)
 */
function logErrorDebugNote() {
    if ((0, isErrorDebug_js_1.isErrorDebug)())
        return;
    const store = (0, getHttpRequestAsyncStore_js_1.getHttpRequestAsyncStore)();
    if (store) {
        if (store.errorDebugNoteAlreadyShown)
            return;
        store.errorDebugNoteAlreadyShown = true;
    }
    const msg = picocolors_1.default.dim([
        '┌─────────────────────────────────────────────────────────────────────┐',
        "│ Error isn't helpful? See https://vite-plugin-ssr.com/errors#verbose │",
        '└─────────────────────────────────────────────────────────────────────┘'
    ].join('\n'));
    (0, log_js_1.logDirectly)(msg, 'error');
}
exports.logErrorDebugNote = logErrorDebugNote;
function getCategory(httpRequestId = null) {
    const store = (0, getHttpRequestAsyncStore_js_1.getHttpRequestAsyncStore)();
    if (store?.httpRequestId !== undefined) {
        if (httpRequestId === null) {
            httpRequestId = store.httpRequestId;
        }
        else {
            (0, utils_js_1.assert)(httpRequestId === store.httpRequestId);
        }
    }
    if (httpRequestId === null)
        return null;
    // const category = httpRequestId % 2 === 1 ? (`request-${httpRequestId}` as const) : (`request(${httpRequestId})` as const)
    const category = `request(${httpRequestId})`;
    return category;
}
