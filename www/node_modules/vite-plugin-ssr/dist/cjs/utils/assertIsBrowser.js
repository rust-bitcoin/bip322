"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIsBrowser = void 0;
const isBrowser_js_1 = require("./isBrowser.js");
const assert_js_1 = require("./assert.js");
function assertIsBrowser() {
    (0, assert_js_1.assert)((0, isBrowser_js_1.isBrowser)());
}
exports.assertIsBrowser = assertIsBrowser;
