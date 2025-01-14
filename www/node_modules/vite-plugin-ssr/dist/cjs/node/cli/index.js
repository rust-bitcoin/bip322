"use strict";
// TODO/v1-release: remove this file
Object.defineProperty(exports, "__esModule", { value: true });
exports.prerender = void 0;
const index_js_1 = require("../prerender/index.js");
const utils_js_1 = require("./utils.js");
const prerender = (options) => {
    (0, utils_js_1.assertWarning)(false, "`import { prerender } from 'vite-plugin-ssr/cli'` is deprecated in favor of `import { prerender } from 'vite-plugin-ssr/prerender'``", { onlyOnce: true, showStackTrace: true });
    return (0, index_js_1.prerender)(options);
};
exports.prerender = prerender;
