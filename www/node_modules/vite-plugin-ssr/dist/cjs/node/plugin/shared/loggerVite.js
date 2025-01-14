"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.improveViteLogs = void 0;
const utils_js_1 = require("../utils.js");
const loggerNotProd_js_1 = require("./loggerNotProd.js");
const errorWithCodeSnippet_js_1 = require("./loggerNotProd/errorWithCodeSnippet.js");
const getHttpRequestAsyncStore_js_1 = require("./getHttpRequestAsyncStore.js");
const removeSuperfluousViteLog_js_1 = require("./loggerVite/removeSuperfluousViteLog.js");
const isErrorDebug_js_1 = require("./isErrorDebug.js");
function improveViteLogs(config) {
    intercept('info', config);
    intercept('warn', config);
    intercept('error', config);
}
exports.improveViteLogs = improveViteLogs;
function intercept(logType, config) {
    config.logger[logType] = (msg, options = {}) => {
        (0, utils_js_1.assert)(!(0, isErrorDebug_js_1.isErrorDebug)());
        if ((0, removeSuperfluousViteLog_js_1.removeSuperfluousViteLog)(msg))
            return;
        if (!!options.timestamp) {
            msg = (0, utils_js_1.trimWithAnsi)(msg);
        }
        else {
            // No timestamp => no "[vite]" tag prepended => we don't trim the beginning of the message
            msg = (0, utils_js_1.trimWithAnsiTrailOnly)(msg);
        }
        msg = cleanFirstViteLog(msg);
        const store = (0, getHttpRequestAsyncStore_js_1.getHttpRequestAsyncStore)();
        // Dedupe Vite error messages
        if (options.error && store?.shouldErrorBeSwallowed(options.error)) {
            return;
        }
        // Remove this once https://github.com/vitejs/vite/pull/13495 is released
        if (msg.startsWith('Transform failed with ') && store && logType === 'error') {
            store.markErrorMessageAsLogged(msg);
            return;
        }
        if (options.error && (0, errorWithCodeSnippet_js_1.isErrorWithCodeSnippet)(options.error)) {
            (0, loggerNotProd_js_1.logViteErrorContainingCodeSnippet)(options.error);
            return;
        }
        // Only allow Vite to clear its first log. All other clearing is controlled by vite-plugin-ssr.
        if (options.clear)
            (0, loggerNotProd_js_1.clearLogs)({ clearIfFirstLog: true });
        if (options.error)
            store?.markErrorAsLogged(options.error);
        // Vite's default logger preprends the "[vite]" tag if and only if options.timestamp is true
        const prependViteTag = options.timestamp || !!store?.httpRequestId;
        (0, loggerNotProd_js_1.logViteAny)(msg, logType, store?.httpRequestId ?? null, prependViteTag);
    };
}
function cleanFirstViteLog(msg) {
    const isFirstVitLog = msg.includes('VITE') && msg.includes('ready');
    if (isFirstVitLog) {
        return (0, utils_js_1.removeEmptyLines)(msg);
    }
    else {
        return msg;
    }
}
