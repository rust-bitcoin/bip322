"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVirtualFileIdPageConfigValuesAll = exports.isVirtualFileIdPageConfigValuesAll = void 0;
const extractAssetsQuery_js_1 = require("../extractAssetsQuery.js");
const utils_js_1 = require("../utils.js");
const idBase = 'virtual:vite-plugin-ssr:pageConfigValuesAll:';
const idBaseClient = `${idBase}client:`;
const idBaseServer = `${idBase}server:`;
function getVirtualFileIdPageConfigValuesAll(pageId, isForClientSide) {
    const id = `${(isForClientSide ? idBaseClient : idBaseServer)}${pageId}`;
    return id;
}
exports.getVirtualFileIdPageConfigValuesAll = getVirtualFileIdPageConfigValuesAll;
function isVirtualFileIdPageConfigValuesAll(id) {
    id = (0, utils_js_1.getVirtualFileId)(id);
    if (!id.includes(idBase))
        return false;
    (0, utils_js_1.assert)(id.startsWith(idBase));
    const idOriginal = id;
    id = (0, extractAssetsQuery_js_1.extractAssetsRemoveQuery)(id);
    const isExtractAssets = idOriginal !== id;
    if (id.startsWith(idBaseClient)) {
        (0, utils_js_1.assert)(isExtractAssets === false);
        return {
            pageId: id.slice(idBaseClient.length),
            isForClientSide: true,
            isExtractAssets
        };
    }
    if (id.startsWith(idBaseServer)) {
        return {
            pageId: id.slice(idBaseServer.length),
            isForClientSide: false,
            isExtractAssets
        };
    }
    (0, utils_js_1.assert)(false);
}
exports.isVirtualFileIdPageConfigValuesAll = isVirtualFileIdPageConfigValuesAll;
