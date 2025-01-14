"use strict";
// Logger used by the the server runtime. (Also during pre-rendering since it uses the sever runtime.)
Object.defineProperty(exports, "__esModule", { value: true });
exports.overwriteRuntimeProductionLogger = exports.logRuntimeInfo = exports.logRuntimeError = void 0;
exports.logRuntimeInfo = null; // logInfo is null in production
const loggerProd_js_1 = require("./loggerProd.js");
// Set production logger (which is overwritten by loggerNotProd.ts in non-production environments such as development and during pre-rendering)
exports.logRuntimeError =
    // @ts-expect-error
    exports.logRuntimeError ??
        // Default
        loggerProd_js_1.logErrorProd;
function overwriteRuntimeProductionLogger(logError_, logInfo_) {
    exports.logRuntimeError = logError_;
    exports.logRuntimeInfo = logInfo_;
}
exports.overwriteRuntimeProductionLogger = overwriteRuntimeProductionLogger;
