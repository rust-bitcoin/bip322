"use strict";
// Internal functions of vps needed by other plugins are exported via this file
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagesAndRoutes = exports.route = void 0;
const index_js_1 = require("../shared/route/index.js");
Object.defineProperty(exports, "route", { enumerable: true, get: function () { return index_js_1.route; } });
const globalContext_js_1 = require("../node/runtime/globalContext.js");
const nodeEnv_js_1 = require("../utils/nodeEnv.js");
const assert_js_1 = require("../utils/assert.js");
const renderPageAlreadyRouted_js_1 = require("../node/runtime/renderPage/renderPageAlreadyRouted.js");
/**
 * Used by {@link https://github.com/magne4000/vite-plugin-vercel|vite-plugin-vercel}
 * to compute some rewrite rules and extract { isr } configs.
 * Needs `import 'vite-plugin-ssr/__internal/setup'`
 * @param config
 */
async function getPagesAndRoutes() {
    (0, nodeEnv_js_1.setNodeEnvToProduction)();
    await (0, globalContext_js_1.initGlobalContext)(true);
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    (0, assert_js_1.assert)(globalContext.isProduction === true);
    const renderContext = await (0, renderPageAlreadyRouted_js_1.getRenderContext)();
    const { pageFilesAll, pageConfigs, allPageIds, pageRoutes } = renderContext;
    return {
        pageRoutes,
        pageFilesAll,
        pageConfigs,
        allPageIds
    };
}
exports.getPagesAndRoutes = getPagesAndRoutes;
