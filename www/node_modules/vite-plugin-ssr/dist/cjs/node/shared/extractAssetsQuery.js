"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAssetsRemoveQuery = exports.extractAssetsAddQuery = void 0;
// We import from node/utils.ts insead of node/plugin/utils.ts because this file is loaded by the server runtime
const utils_js_1 = require("./utils.js");
const query = 'extractAssets';
function extractAssetsAddQuery(id) {
    const fileExtension = (0, utils_js_1.getFileExtension)(id);
    (0, utils_js_1.assert)(fileExtension || id.includes('virtual:vite-plugin-ssr:'));
    if (!fileExtension)
        return `${id}?${query}`;
    if (id.includes('?')) {
        id = id.replace('?', `?${query}&`);
    }
    else {
        id = `${id}?${query}&lang.${fileExtension}`;
    }
    return id;
}
exports.extractAssetsAddQuery = extractAssetsAddQuery;
function extractAssetsRemoveQuery(id) {
    if (!id.includes('?'))
        return id;
    const suffix = `?${query}`;
    // Only supports 'virtual:vite-plugin-ssr:' IDs
    (0, utils_js_1.assert)(id.endsWith(query));
    return id.slice(0, -1 * suffix.length);
}
exports.extractAssetsRemoveQuery = extractAssetsRemoveQuery;
