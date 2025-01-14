export { getHook };
export { assertHook };
export { assertHookFn };
import { assert, assertUsage, checkType, isCallable } from '../utils.js';
function getHook(pageContext, hookName) {
    if (!(hookName in pageContext.exports)) {
        return null;
    }
    const hookFn = pageContext.exports[hookName];
    const file = pageContext.exportsAll[hookName][0];
    assert(file.exportValue === hookFn);
    if (hookFn === null)
        return null;
    const hookFilePath = file.exportSource;
    assertHookFn(hookFn, { hookName, hookFilePath });
    return { hookFn, hookName, hookFilePath };
}
function assertHook(pageContext, hookName) {
    getHook(pageContext, hookName);
}
function assertHookFn(hookFn, { hookName, hookFilePath }) {
    assert(hookName && hookFilePath);
    assert(!hookName.endsWith(')'));
    assertUsage(isCallable(hookFn), `hook ${hookName}() defined by ${hookFilePath} should be a function`);
    checkType(hookFn);
}
