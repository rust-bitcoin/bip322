export { assert };
export { assertUsage };
export { assertWarning };
export { assertInfo };
export { getProjectError };
export { addOnBeforeLogHook };
export { getAssertErrMsg };
export { overwriteAssertProductionLogger };
export { isBug };
type Logger = (msg: string | Error, logType: 'warn' | 'info') => void;
declare function assert(condition: unknown, debugInfo?: unknown): asserts condition;
declare function assertUsage(condition: unknown, errMsg: string, { showStackTrace }?: {
    showStackTrace?: true;
}): asserts condition;
declare function getProjectError(errMsg: string): Error;
declare function assertWarning(condition: unknown, msg: string, { onlyOnce, showStackTrace }: {
    onlyOnce: boolean | string;
    showStackTrace?: true;
}): void;
declare function assertInfo(condition: unknown, msg: string, { onlyOnce }: {
    onlyOnce: boolean;
}): void;
declare function addOnBeforeLogHook(onBeforeLog: () => void): void;
declare function getAssertErrMsg(thing: unknown): {
    assertMsg: string;
    showVikeVersion: boolean;
} | null;
declare function overwriteAssertProductionLogger(logger: Logger): void;
declare function isBug(err: unknown): boolean;
