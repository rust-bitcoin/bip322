"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viteIsSSR_options = exports.viteIsSSR = void 0;
const assert_js_1 = require("./assert.js");
const isObject_js_1 = require("./isObject.js");
function viteIsSSR(config) {
    return !!config?.build?.ssr;
}
exports.viteIsSSR = viteIsSSR;
// https://github.com/vitejs/vite/discussions/5109#discussioncomment-1450726
function viteIsSSR_options(options) {
    if (options === undefined) {
        return false;
    }
    if (typeof options === 'boolean') {
        return options;
    }
    if ((0, isObject_js_1.isObject)(options)) {
        return !!options.ssr;
    }
    (0, assert_js_1.assert)(false);
}
exports.viteIsSSR_options = viteIsSSR_options;
