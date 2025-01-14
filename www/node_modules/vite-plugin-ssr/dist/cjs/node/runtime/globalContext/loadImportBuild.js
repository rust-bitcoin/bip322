"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setImportBuildGetters = exports.loadImportBuild = void 0;
const loadServerBuild_js_1 = require("@brillout/vite-plugin-import-build/loadServerBuild.js");
const utils_js_1 = require("../utils.js");
const buildGetters = (globalThis.__vite_plugin_ssr__buildGetters = globalThis.__vite_plugin_ssr__buildGetters || {
    getters: null
});
function setImportBuildGetters(getters) {
    buildGetters.getters = getters;
}
exports.setImportBuildGetters = setImportBuildGetters;
async function loadImportBuild(outDir) {
    if (!buildGetters.getters) {
        await (0, loadServerBuild_js_1.loadServerBuild)(outDir);
        // Await dist/server/importBuild.cjs
        await (0, utils_js_1.autoRetry)(() => {
            (0, utils_js_1.assert)(buildGetters.getters);
        }, 2000);
        (0, utils_js_1.assert)(buildGetters.getters);
    }
    const [pageFiles, clientManifest, pluginManifest] = await Promise.all([
        buildGetters.getters.pageFiles(),
        buildGetters.getters.clientManifest(),
        buildGetters.getters.pluginManifest()
    ]);
    const buildEntries = { pageFiles, clientManifest, pluginManifest };
    return buildEntries;
}
exports.loadImportBuild = loadImportBuild;
