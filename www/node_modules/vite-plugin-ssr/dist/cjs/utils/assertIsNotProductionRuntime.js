"use strict";
// Mechanism to ensure code isn't loaded by production runtime
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertEnv = exports.markEnvAsVite = exports.markEnvAsPreview = exports.markEnvAsDev = exports.assertIsNotProductionRuntime = void 0;
const assert_js_1 = require("./assert.js");
const assertIsNotBrowser_js_1 = require("./assertIsNotBrowser.js");
const getGlobalObject_js_1 = require("./getGlobalObject.js");
const isVitest_js_1 = require("./isVitest.js");
(0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
const env = (0, getGlobalObject_js_1.getGlobalObject)('utils/assertIsNotProductionRuntime.ts', {});
// Called by *.ts that want to ensure that they aren't loaded by the server runtime in production
function assertIsNotProductionRuntime() {
    env.shouldBeVite = true;
}
exports.assertIsNotProductionRuntime = assertIsNotProductionRuntime;
// Called by Vite hook configureServer()
function markEnvAsDev() {
    env.isDev = true;
}
exports.markEnvAsDev = markEnvAsDev;
// Called by Vite hook configurePreviewServer()
function markEnvAsPreview() {
    env.isPreview = true;
}
exports.markEnvAsPreview = markEnvAsPreview;
// Called by ../node/plugin/index.ts
function markEnvAsVite() {
    env.isVite = true;
}
exports.markEnvAsVite = markEnvAsVite;
// Called by ../node/runtime/index.ts
function assertEnv() {
    if ((0, isVitest_js_1.isVitest)())
        return;
    if (env.isDev || env.isPreview) {
        (0, assert_js_1.assert)(env.isVite);
        (0, assert_js_1.assert)(env.shouldBeVite);
    }
    else {
        (0, assert_js_1.assert)(!env.isVite);
        (0, assert_js_1.assert)(!env.shouldBeVite);
    }
}
exports.assertEnv = assertEnv;
