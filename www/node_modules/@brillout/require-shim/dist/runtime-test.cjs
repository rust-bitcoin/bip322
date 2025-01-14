"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_cjs_1 = require("./utils.cjs");
testRequireShim();
function testRequireShim() {
    let req;
    // This code can end up being ESM if it's bundled
    try {
        req = require;
    }
    catch (_a) { }
    if (!req)
        return;
    // Ensure that our globalThis.require doesn't overwrite the native require() implementation
    (0, utils_cjs_1.assert)(!('_is_brillout_require_shim' in require));
}
