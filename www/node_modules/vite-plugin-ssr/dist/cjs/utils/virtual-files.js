"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVirtualFileId = exports.getVirtualFileId = exports.isVirtualFileId = void 0;
const assert_js_1 = require("./assert.js");
const idBase = 'virtual:vite-plugin-ssr:';
// https://vitejs.dev/guide/api-plugin.html#virtual-modules-convention
const tag = '\0';
function isVirtualFileId(id) {
    if (id.startsWith(idBase))
        return true;
    if (id.startsWith(tag + idBase))
        return true;
    (0, assert_js_1.assert)(!id.includes(idBase));
    return false;
}
exports.isVirtualFileId = isVirtualFileId;
function getVirtualFileId(id) {
    if (id.startsWith(tag)) {
        id = id.slice(tag.length);
    }
    (0, assert_js_1.assert)(!id.startsWith(tag));
    return id;
}
exports.getVirtualFileId = getVirtualFileId;
function resolveVirtualFileId(id) {
    (0, assert_js_1.assert)(isVirtualFileId(id));
    if (!id.startsWith(tag)) {
        id = tag + id;
    }
    (0, assert_js_1.assert)(id.startsWith(tag));
    return id;
}
exports.resolveVirtualFileId = resolveVirtualFileId;
