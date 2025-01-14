"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNodeVersion = void 0;
const assert_js_1 = require("./assert.js");
const isNodeJS_js_1 = require("./isNodeJS.js");
// package.json#engines.node isn't enough as users can ignore it
function assertNodeVersion() {
    if (!(0, isNodeJS_js_1.isNodeJS)())
        return;
    const version = process.versions.node;
    const major = parseInt(version.split('.')[0], 10);
    (0, assert_js_1.assertUsage)(major >= 16, `Node.js ${version} isn't supported, use Node.js >=16.0.0 instead.`);
}
exports.assertNodeVersion = assertNodeVersion;
