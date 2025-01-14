"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDev2 = exports.isDev1_onConfigureServer = exports.isDev1 = void 0;
// There isn't any reliable way to test whether Vite is ran as dev/build/preview/optimizeDep
//  - Failed attempt to make a PR: https://github.com/brillout/vite/tree/fix/config-operation
// ********
// Method 1 - most reliable
// ********
const assert_js_1 = require("./assert.js");
const getGlobalObject_js_1 = require("./getGlobalObject.js");
const globalObject = (0, getGlobalObject_js_1.getGlobalObject)('utils/isDev.ts', { isDev: false, isDev_wasCalled: false });
function isDev1() {
    globalObject.isDev_wasCalled = true;
    return globalObject.isDev;
}
exports.isDev1 = isDev1;
function isDev1_onConfigureServer() {
    // configureServer() is called more than once when user presses Vite's dev server reload hotkey <r>
    if (globalObject.isDev)
        return;
    (0, assert_js_1.assert)(!globalObject.isDev_wasCalled);
    globalObject.isDev = true;
}
exports.isDev1_onConfigureServer = isDev1_onConfigureServer;
function isDev2(config) {
    const isDev = config.command === 'serve' &&
        // Mode is 'development' by default: https://github.com/vitejs/vite/blob/bf9c49f521b7a6730231c35754d5e1f9c3a6a16e/packages/vite/src/node/config.ts#L383
        // Note that user can override this: https://github.com/vitejs/vite/blob/bf9c49f521b7a6730231c35754d5e1f9c3a6a16e/packages/vite/src/node/cli.ts#L126
        config.mode === 'development';
    return isDev;
}
exports.isDev2 = isDev2;
