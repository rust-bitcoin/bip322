"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logLabel = exports.assertUsage = exports.assert = void 0;
const createErrorWithCleanStackTrace_1 = require("./createErrorWithCleanStackTrace");
const projectInfo_1 = require("./projectInfo");
const logLabel = `[${projectInfo_1.projectInfo.npmPackageName}@${projectInfo_1.projectInfo.projectVersion}]`;
exports.logLabel = logLabel;
const internalErrorPrefix = `${logLabel}[Bug]`;
const usageErrorPrefix = `${logLabel}[Wrong Usage]`;
// We set to `0` because @brillout/vite-plugin-import-build is never used directly by the user
const numberOfStackTraceLinesToRemove = 0;
function assert(condition, debugInfo) {
    if (condition) {
        return;
    }
    const debugStr = (() => {
        if (!debugInfo) {
            return null;
        }
        const debugInfoSerialized = typeof debugInfo === 'string' ? debugInfo : '`' + JSON.stringify(debugInfo) + '`';
        return `Debug info (this is for the ${projectInfo_1.projectInfo.projectName} maintainers; you can ignore this): ${debugInfoSerialized}`;
    })();
    const internalError = (0, createErrorWithCleanStackTrace_1.createErrorWithCleanStackTrace)([
        `${internalErrorPrefix} You stumbled upon a bug in the source code of ${projectInfo_1.projectInfo.projectName}.`,
        `Reach out at ${projectInfo_1.projectInfo.githubRepository}/issues/new and include this error stack (the error stack is usually enough to fix the problem).`,
        'A maintainer will fix the bug (usually under 24 hours).',
        `Don't hesitate to reach out as it makes ${projectInfo_1.projectInfo.projectName} more robust.`,
        debugStr
    ]
        .filter(Boolean)
        .join(' '), numberOfStackTraceLinesToRemove);
    throw internalError;
}
exports.assert = assert;
function assertUsage(condition, errorMessage) {
    if (condition) {
        return;
    }
    const errMsg = `${usageErrorPrefix} ${errorMessage}`;
    const usageError = (0, createErrorWithCleanStackTrace_1.createErrorWithCleanStackTrace)(errMsg, numberOfStackTraceLinesToRemove);
    throw usageError;
}
exports.assertUsage = assertUsage;
/*
export { assertWarning }
const warningPrefix = `${logLabel}[Warning]` as const
function assertWarning(condition: unknown, errorMessage: string): void {
  if (condition) {
    return
  }
  const msg = `${warningPrefix} ${errorMessage}`
  console.warn(msg)
}
*/
