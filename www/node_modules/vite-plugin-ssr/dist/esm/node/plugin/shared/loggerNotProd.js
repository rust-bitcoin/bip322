// Non-production logger used for:
//  - Development
//  - Preview
//  - Build
//  - Pre-rendering
// In other words: everywhere except in production
export { logViteAny };
export { logViteErrorContainingCodeSnippet };
export { logConfigInfo };
export { logConfigError };
export { logConfigErrorRecover };
export { logErrorDebugNote };
export { clearLogs };
import { isAbortError } from '../../../shared/route/abort.js';
import { getViteConfig } from '../../runtime/globalContext.js';
import { overwriteRuntimeProductionLogger } from '../../runtime/renderPage/loggerRuntime.js';
import { assert, assertIsNotProductionRuntime, getAssertErrMsg, isUserHookError, overwriteAssertProductionLogger, stripAnsi, warnIfErrorIsNotObject } from '../utils.js';
import { getHttpRequestAsyncStore } from './getHttpRequestAsyncStore.js';
import { isErrorDebug } from './isErrorDebug.js';
import { isErrorWithCodeSnippet, getPrettyErrorWithCodeSnippet } from './loggerNotProd/errorWithCodeSnippet.js';
import { getConfigExececutionErrorIntroMsg, getConfigBuildErrorFormatted } from '../plugins/importUserCode/v1-design/transpileAndExecuteFile.js';
import { logWithVikeTag, logWithViteTag, logDirectly, isFirstLog, screenHasErrors, clearScreen } from './loggerNotProd/log.js';
import pc from '@brillout/picocolors';
import { setAlreadyLogged } from '../../runtime/renderPage/isNewError.js';
import { isConfigInvalid } from '../../runtime/renderPage/isConfigInvalid.js';
assertIsNotProductionRuntime();
overwriteRuntimeProductionLogger(logRuntimeError, logRuntimeInfo);
overwriteAssertProductionLogger(assertLogger);
function logRuntimeInfo(msg, httpRequestId, logType, clearErrors) {
    if (clearErrors)
        clearLogs({ clearErrors: true });
    const category = getCategory(httpRequestId);
    assert(category);
    logWithVikeTag(msg, logType, category);
}
function logViteAny(msg, logType, httpRequestId, prependViteTag) {
    if (prependViteTag) {
        const category = getCategory(httpRequestId);
        logWithViteTag(msg, logType, category);
    }
    else {
        logDirectly(msg, logType);
    }
}
function logConfigInfo(msg, logType) {
    const category = getConfigCategory();
    logWithVikeTag(msg, logType, category);
}
function logConfigErrorRecover() {
    const msg = pc.bold(pc.green('Configuration successfully loaded'));
    clearLogs({ clearAlsoIfConfigIsInvalid: true });
    const category = getConfigCategory();
    logWithVikeTag(msg, 'error-recover', category);
}
function logRuntimeError(err, 
/** `httpRequestId` is `null` when pre-rendering */
httpRequestId) {
    logErr(err, httpRequestId);
}
function logViteErrorContainingCodeSnippet(err) {
    logErr(err);
}
function logErr(err, httpRequestId = null) {
    warnIfErrorIsNotObject(err);
    if (isAbortError(err) && !isErrorDebug()) {
        return;
    }
    const store = getHttpRequestAsyncStore();
    setAlreadyLogged(err);
    if (getHttpRequestAsyncStore()?.shouldErrorBeSwallowed(err)) {
        if (!isErrorDebug())
            return;
    }
    else {
        store?.markErrorAsLogged(err);
    }
    const category = getCategory(httpRequestId);
    if (!isErrorDebug()) {
        if (isErrorWithCodeSnippet(err)) {
            // We handle transpile errors globally because wrapping viteDevServer.ssrLoadModule() wouldn't be enough: transpile errors can be thrown not only when calling viteDevServer.ssrLoadModule() but also later when loading user code with import() (since Vite lazy-transpiles import() calls)
            const viteConfig = getViteConfig();
            assert(viteConfig);
            let prettyErr = getPrettyErrorWithCodeSnippet(err, viteConfig.root);
            assert(stripAnsi(prettyErr).startsWith('Failed to transpile'));
            logWithViteTag(prettyErr, 'error', category);
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
    const hook = isUserHookError(err);
    if (hook) {
        const { hookName, hookFilePath } = hook;
        logWithVikeTag(pc.red(`Following error was thrown by the ${hookName}() hook defined at ${hookFilePath}`), 'error', category);
    }
    else if (category) {
        logFallbackErrIntro(category);
    }
    logDirectly(err, 'error');
}
function logConfigError(err) {
    clearLogs({ clearAlsoIfConfigIsInvalid: true });
    warnIfErrorIsNotObject(err);
    const category = getConfigCategory();
    {
        const errIntroMsg = getConfigExececutionErrorIntroMsg(err);
        if (errIntroMsg) {
            assert(stripAnsi(errIntroMsg).startsWith('Failed to execute'));
            logWithVikeTag(errIntroMsg, 'error', category);
            logDirectly(err, 'error');
            return;
        }
    }
    {
        const errMsgFormatted = getConfigBuildErrorFormatted(err);
        if (errMsgFormatted) {
            assert(stripAnsi(errMsgFormatted).startsWith('Failed to transpile'));
            if (!isErrorDebug()) {
                logWithVikeTag(errMsgFormatted, 'error', category);
            }
            else {
                logDirectly(err, 'error');
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
    logDirectly(err, 'error');
}
function logFallbackErrIntro(category) {
    logWithVikeTag(pc.bold(pc.red('[Error] An error was thrown:')), 'error', category);
}
function getConfigCategory() {
    const category = getCategory() ?? 'config';
    return category;
}
function handleAssertMsg(err, category) {
    const res = getAssertErrMsg(err);
    if (!res)
        return false;
    const { assertMsg, showVikeVersion } = res;
    logWithVikeTag(assertMsg, 'error', category, showVikeVersion);
    return true;
}
function assertLogger(thing, logType) {
    const category = getCategory();
    const res = getAssertErrMsg(thing);
    /* Risk of infinite loop
    assert(res)
    */
    if (!res)
        throw new Error('Internal error, reach out to a maintainer');
    const { assertMsg, showVikeVersion } = res;
    logWithVikeTag(assertMsg, logType, category, showVikeVersion);
}
function clearLogs(conditions = {}) {
    if (!conditions.clearAlsoIfConfigIsInvalid && isConfigInvalid) {
        // Avoid hiding the config error: the config error is printed only once
        return;
    }
    if (conditions.clearErrors && !screenHasErrors) {
        return;
    }
    if (conditions.clearIfFirstLog && !isFirstLog) {
        return;
    }
    const viteConfig = getViteConfig();
    if (viteConfig) {
        clearScreen(viteConfig);
    }
}
/** Note shown to user when vite-plugin-ssr does something risky:
 *  - When vite-plugin-ssr dedupes (i.e. swallows) an error with getHttpRequestAsyncStore().shouldErrorBeSwallowed(err)
 *  - When vite-plugin-ssr modifies the error with getPrettyErrorWithCodeSnippet(err)
 */
function logErrorDebugNote() {
    if (isErrorDebug())
        return;
    const store = getHttpRequestAsyncStore();
    if (store) {
        if (store.errorDebugNoteAlreadyShown)
            return;
        store.errorDebugNoteAlreadyShown = true;
    }
    const msg = pc.dim([
        '┌─────────────────────────────────────────────────────────────────────┐',
        "│ Error isn't helpful? See https://vite-plugin-ssr.com/errors#verbose │",
        '└─────────────────────────────────────────────────────────────────────┘'
    ].join('\n'));
    logDirectly(msg, 'error');
}
function getCategory(httpRequestId = null) {
    const store = getHttpRequestAsyncStore();
    if (store?.httpRequestId !== undefined) {
        if (httpRequestId === null) {
            httpRequestId = store.httpRequestId;
        }
        else {
            assert(httpRequestId === store.httpRequestId);
        }
    }
    if (httpRequestId === null)
        return null;
    // const category = httpRequestId % 2 === 1 ? (`request-${httpRequestId}` as const) : (`request(${httpRequestId})` as const)
    const category = `request(${httpRequestId})`;
    return category;
}
