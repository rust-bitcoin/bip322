export { logViteAny };
export { logViteErrorContainingCodeSnippet };
export { logConfigInfo };
export { logConfigError };
export { logConfigErrorRecover };
export { logErrorDebugNote };
export { clearLogs };
export type { LogInfo };
export type { LogInfoArgs };
export type { LogError };
export type { LogErrorArgs };
export type { LogType };
export type { LogCategory };
import { type ErrorWithCodeSnippet } from './loggerNotProd/errorWithCodeSnippet.js';
type LogType = 'info' | 'warn' | 'error' | 'error-recover';
type LogCategory = 'config' | `request(${number})`;
type LogInfo = (...args: LogInfoArgs) => void;
type LogInfoArgs = Parameters<typeof logRuntimeInfo>;
type LogError = (...args: LogErrorArgs) => void;
type LogErrorArgs = Parameters<typeof logRuntimeError>;
declare function logRuntimeInfo(msg: string, httpRequestId: number, logType: LogType, clearErrors?: boolean): void;
declare function logViteAny(msg: string, logType: LogType, httpRequestId: number | null, prependViteTag: boolean): void;
declare function logConfigInfo(msg: string, logType: LogType): void;
declare function logConfigErrorRecover(): void;
declare function logRuntimeError(err: unknown, 
/** `httpRequestId` is `null` when pre-rendering */
httpRequestId: number | null): void;
declare function logViteErrorContainingCodeSnippet(err: ErrorWithCodeSnippet): void;
declare function logConfigError(err: unknown): void;
declare function clearLogs(conditions?: {
    clearErrors?: boolean;
    clearIfFirstLog?: boolean;
    clearAlsoIfConfigIsInvalid?: boolean;
}): void;
/** Note shown to user when vite-plugin-ssr does something risky:
 *  - When vite-plugin-ssr dedupes (i.e. swallows) an error with getHttpRequestAsyncStore().shouldErrorBeSwallowed(err)
 *  - When vite-plugin-ssr modifies the error with getPrettyErrorWithCodeSnippet(err)
 */
declare function logErrorDebugNote(): void;
