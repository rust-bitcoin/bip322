"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePageServerSide = void 0;
const utils_js_1 = require("../utils.js");
const getAllPageIdFiles_js_1 = require("./getAllPageIdFiles.js");
async function analyzePageServerSide(pageFilesAll, pageId) {
    const pageFilesServerSide = (0, getAllPageIdFiles_js_1.getPageFilesServerSide)(pageFilesAll, pageId);
    const pageFilesServerSideOnly = pageFilesServerSide.filter((p) => p.fileType === '.page.server');
    await Promise.all(pageFilesServerSideOnly.map(async (p) => {
        // In production, `exportNames` are preload
        if (p.exportNames) {
            return;
        }
        (0, utils_js_1.assert)(p.loadExportNames, pageId);
        await p.loadExportNames();
    }));
    const hasOnBeforeRenderServerSideOnlyHook = pageFilesServerSideOnly.some(({ exportNames }) => {
        (0, utils_js_1.assert)(exportNames);
        return exportNames.includes('onBeforeRender');
    });
    return { hasOnBeforeRenderServerSideOnlyHook };
}
exports.analyzePageServerSide = analyzePageServerSide;
