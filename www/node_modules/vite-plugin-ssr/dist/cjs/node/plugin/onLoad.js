"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLoad = void 0;
const assertIsNotBrowser_js_1 = require("../../utils/assertIsNotBrowser.js");
const assertIsNotProductionRuntime_js_1 = require("../../utils/assertIsNotProductionRuntime.js");
const assertNodeVersion_js_1 = require("../../utils/assertNodeVersion.js");
function onLoad() {
    (0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
    (0, assertNodeVersion_js_1.assertNodeVersion)();
    // Ensure we don't bloat the server runtime with heavy plugin dependencies such as esbuild
    (0, assertIsNotProductionRuntime_js_1.assertIsNotProductionRuntime)();
}
exports.onLoad = onLoad;
