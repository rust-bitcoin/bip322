"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVirtualFileIdImportUserCode = exports.virtualFileIdImportUserCodeClientCR = exports.virtualFileIdImportUserCodeClientSR = exports.virtualFileIdImportUserCodeServer = void 0;
const utils_js_1 = require("../utils.js");
const idBase = 'virtual:vite-plugin-ssr:importUserCode';
const virtualFileIdImportUserCodeServer = `${idBase}:server`;
exports.virtualFileIdImportUserCodeServer = virtualFileIdImportUserCodeServer;
const virtualFileIdImportUserCodeClientSR = `${idBase}:client:server-routing`;
exports.virtualFileIdImportUserCodeClientSR = virtualFileIdImportUserCodeClientSR;
const virtualFileIdImportUserCodeClientCR = `${idBase}:client:client-routing`;
exports.virtualFileIdImportUserCodeClientCR = virtualFileIdImportUserCodeClientCR;
function isVirtualFileIdImportUserCode(id) {
    id = (0, utils_js_1.getVirtualFileId)(id);
    if (!id.startsWith(idBase))
        return false;
    (0, utils_js_1.assert)(
    // prettier-ignore
    [
        virtualFileIdImportUserCodeServer,
        virtualFileIdImportUserCodeClientCR,
        virtualFileIdImportUserCodeClientSR
    ].includes(id));
    const isForClientSide = id !== virtualFileIdImportUserCodeServer;
    const isClientRouting = id === virtualFileIdImportUserCodeClientCR;
    return { isForClientSide, isClientRouting };
}
exports.isVirtualFileIdImportUserCode = isVirtualFileIdImportUserCode;
