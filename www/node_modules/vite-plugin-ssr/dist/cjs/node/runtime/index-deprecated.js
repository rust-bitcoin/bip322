"use strict";
// TODO/v1-release: replace this with:
// assertUsage(false, "`import { something } from 'vite-plugin-ssr'` doesn't exist: instead import from 'vite-plugin-ssr/server', 'vite-plugin-ssr/client', 'vite-plugin-ssr/plugin', ...")
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderErrorPage = void 0;
__exportStar(require("./index-common.js"), exports);
__exportStar(require("../../types/index-dreprecated.js"), exports);
const utils_js_1 = require("./utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const abort_js_1 = require("../../shared/route/abort.js");
/** @deprecated
 * Replace:
 *   ```
 *   import { RenderErrorPage } from 'vite-plugin-ssr'
 *   ```
 * With:
 *   ```
 *   import { render } from 'vite-plugin-ssr/abort'
 *   ```
 *
 * See https://vite-plugin-ssr.com/render
 */
const RenderErrorPage = (...args) => {
    (0, utils_js_1.assertWarning)(false, [
        'Replace:',
        picocolors_1.default.red("  import { RenderErrorPage } from 'vite-plugin-ssr'"),
        'With:',
        picocolors_1.default.green("  import { render } from 'vite-plugin-ssr/abort'"),
        'See https://vite-plugin-ssr.com/render'
    ].join('\n'), { onlyOnce: true, showStackTrace: true });
    return (0, abort_js_1.RenderErrorPage)(...args);
};
exports.RenderErrorPage = RenderErrorPage;
(0, utils_js_1.assertWarning)(false, [
    'You have following imports which are outdated:',
    picocolors_1.default.red("  import { something } from 'vite-plugin-ssr'"),
    'Replace them with:',
    picocolors_1.default.green("  import { something } from 'vite-plugin-ssr/server'"),
    `Or if ${picocolors_1.default.cyan('something')} is a type:`,
    picocolors_1.default.green("  import type { something } from 'vite-plugin-ssr/types'"),
    "Make sure to import renderPage(), escapeInject, html, dangerouslySkipEscape(), pipeWebStream(), pipeNodeStream(), pipeStream(), stampPipe() from 'vite-plugin-ssr/server'. (Or inspect the error stack below to find the import causing this warning.)"
].join('\n'), { showStackTrace: true, onlyOnce: true });
const utils_js_2 = require("./utils.js");
(0, utils_js_2.assertUsage)(!(0, utils_js_2.isBrowser)(), "It's forbidden to `import { something } from 'vite-plugin-ssr'` in code loaded in the browser: the module 'vite-plugin-ssr' is a server-only module.", { showStackTrace: true });
