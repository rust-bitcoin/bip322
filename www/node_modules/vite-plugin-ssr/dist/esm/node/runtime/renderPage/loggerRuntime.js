// Logger used by the the server runtime. (Also during pre-rendering since it uses the sever runtime.)
export let logRuntimeError;
export let logRuntimeInfo = null; // logInfo is null in production
export { overwriteRuntimeProductionLogger };
import { logErrorProd } from './loggerProd.js';
// Set production logger (which is overwritten by loggerNotProd.ts in non-production environments such as development and during pre-rendering)
logRuntimeError =
    // @ts-expect-error
    logRuntimeError ??
        // Default
        logErrorProd;
function overwriteRuntimeProductionLogger(logError_, logInfo_) {
    logRuntimeError = logError_;
    logRuntimeInfo = logInfo_;
}
