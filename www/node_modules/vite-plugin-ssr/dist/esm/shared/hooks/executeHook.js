export { executeHook };
export { isUserHookError };
import { getProjectError, assertWarning } from '../../utils/assert.js';
import { getGlobalObject } from '../../utils/getGlobalObject.js';
import { humanizeTime } from '../../utils/humanizeTime.js';
import { isObject } from '../../utils/isObject.js';
const globalObject = getGlobalObject('utils/executeHook.ts', {
    userHookErrors: new Map()
});
function isUserHookError(err) {
    if (!isObject(err))
        return false;
    return globalObject.userHookErrors.get(err) ?? false;
}
function executeHook(hookFn, hookName, hookFilePath) {
    const { timeoutErr, timeoutWarn } = getTimeouts(hookName);
    let resolve;
    let reject;
    const promise = new Promise((resolve_, reject_) => {
        resolve = (ret) => {
            clearTimeouts();
            resolve_(ret);
        };
        reject = (err) => {
            clearTimeouts();
            reject_(err);
        };
    });
    const clearTimeouts = () => {
        clearTimeout(t1);
        clearTimeout(t2);
    };
    const t1 = setTimeout(() => {
        assertWarning(false, `The ${hookName}() hook defined by ${hookFilePath} is taking more than ${humanizeTime(timeoutWarn)}`, { onlyOnce: false });
    }, timeoutWarn);
    const t2 = setTimeout(() => {
        const err = getProjectError(`Hook timeout: the ${hookName}() hook defined by ${hookFilePath} didn't finish after ${humanizeTime(timeoutErr)}`);
        reject(err);
    }, timeoutErr);
    (async () => {
        try {
            const ret = await hookFn();
            resolve(ret);
        }
        catch (err) {
            if (isObject(err)) {
                globalObject.userHookErrors.set(err, { hookName, hookFilePath });
            }
            reject(err);
        }
    })();
    return promise;
}
function getTimeouts(hookName) {
    if (hookName === 'onBeforeRoute') {
        return {
            timeoutErr: 5 * 1000,
            timeoutWarn: 1 * 1000
        };
    }
    if (hookName === 'onBeforePrerender') {
        return {
            timeoutErr: 10 * 60 * 1000,
            timeoutWarn: 30 * 1000
        };
    }
    return {
        timeoutErr: 40 * 1000,
        timeoutWarn: 4 * 1000
    };
}
