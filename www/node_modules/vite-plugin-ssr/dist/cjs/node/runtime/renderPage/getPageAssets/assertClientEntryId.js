"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertClientEntryId = void 0;
const globalContext_js_1 = require("../../globalContext.js");
const utils_js_1 = require("../../utils.js");
const virtualFilePageConfigValuesAll_js_1 = require("../../../shared/virtual-files/virtualFilePageConfigValuesAll.js");
function assertClientEntryId(id) {
    (0, utils_js_1.assertPosixPath)(id);
    (0, utils_js_1.assert)(!id.startsWith('/@fs'), id);
    const isPkg = (0, utils_js_1.isNpmPackageImport)(id);
    (0, utils_js_1.assert)(
    // Client entry
    id.startsWith('@@vite-plugin-ssr/') ||
        // User files
        id.startsWith('/') ||
        // Page code importer
        (0, virtualFilePageConfigValuesAll_js_1.isVirtualFileIdPageConfigValuesAll)(id) ||
        // Stem packages
        isPkg, id);
    if (isPkg) {
        const { configVps } = (0, globalContext_js_1.getGlobalContext)();
        (0, utils_js_1.assert)(configVps === null || configVps.extensions.some(({ npmPackageName }) => id.startsWith(npmPackageName)), id);
    }
}
exports.assertClientEntryId = assertClientEntryId;
