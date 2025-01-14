"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertHookFn = exports.assertHook = exports.getHook = void 0;
const utils_js_1 = require("../utils.js");
function getHook(pageContext, hookName) {
    if (!(hookName in pageContext.exports)) {
        return null;
    }
    const hookFn = pageContext.exports[hookName];
    const file = pageContext.exportsAll[hookName][0];
    (0, utils_js_1.assert)(file.exportValue === hookFn);
    if (hookFn === null)
        return null;
    const hookFilePath = file.exportSource;
    assertHookFn(hookFn, { hookName, hookFilePath });
    return { hookFn, hookName, hookFilePath };
}
exports.getHook = getHook;
function assertHook(pageContext, hookName) {
    getHook(pageContext, hookName);
}
exports.assertHook = assertHook;
function assertHookFn(hookFn, { hookName, hookFilePath }) {
    (0, utils_js_1.assert)(hookName && hookFilePath);
    (0, utils_js_1.assert)(!hookName.endsWith(')'));
    (0, utils_js_1.assertUsage)((0, utils_js_1.isCallable)(hookFn), `hook ${hookName}() defined by ${hookFilePath} should be a function`);
    (0, utils_js_1.checkType)(hookFn);
}
exports.assertHookFn = assertHookFn;
