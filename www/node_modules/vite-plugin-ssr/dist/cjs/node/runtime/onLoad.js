"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLoad = void 0;
const assertIsNotBrowser_js_1 = require("../../utils/assertIsNotBrowser.js");
const assertNodeVersion_js_1 = require("../../utils/assertNodeVersion.js");
const require_shim_1 = require("@brillout/require-shim");
function onLoad() {
    (0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
    (0, assertNodeVersion_js_1.assertNodeVersion)();
    (0, require_shim_1.installRequireShim)();
}
exports.onLoad = onLoad;
