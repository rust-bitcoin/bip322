export declare let logRuntimeError: LogError;
export declare let logRuntimeInfo: null | LogInfo;
export { overwriteRuntimeProductionLogger };
import type { LogError, LogInfo } from '../../plugin/shared/loggerNotProd.js';
declare function overwriteRuntimeProductionLogger(logError_: LogError, logInfo_: LogInfo | null): void;
