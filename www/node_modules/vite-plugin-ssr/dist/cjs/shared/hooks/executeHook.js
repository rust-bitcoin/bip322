"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserHookError = exports.executeHook = void 0;
const assert_js_1 = require("../../utils/assert.js");
const getGlobalObject_js_1 = require("../../utils/getGlobalObject.js");
const humanizeTime_js_1 = require("../../utils/humanizeTime.js");
const isObject_js_1 = require("../../utils/isObject.js");
const globalObject = (0, getGlobalObject_js_1.getGlobalObject)('utils/executeHook.ts', {
    userHookErrors: new Map()
});
function isUserHookError(err) {
    if (!(0, isObject_js_1.isObject)(err))
        return false;
    return globalObject.userHookErrors.get(err) ?? false;
}
exports.isUserHookError = isUserHookError;
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
        (0, assert_js_1.assertWarning)(false, `The ${hookName}() hook defined by ${hookFilePath} is taking more than ${(0, humanizeTime_js_1.humanizeTime)(timeoutWarn)}`, { onlyOnce: false });
    }, timeoutWarn);
    const t2 = setTimeout(() => {
        const err = (0, assert_js_1.getProjectError)(`Hook timeout: the ${hookName}() hook defined by ${hookFilePath} didn't finish after ${(0, humanizeTime_js_1.humanizeTime)(timeoutErr)}`);
        reject(err);
    }, timeoutErr);
    (async () => {
        try {
            const ret = await hookFn();
            resolve(ret);
        }
        catch (err) {
            if ((0, isObject_js_1.isObject)(err)) {
                globalObject.userHookErrors.set(err, { hookName, hookFilePath });
            }
            reject(err);
        }
    })();
    return promise;
}
exports.executeHook = executeHook;
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
