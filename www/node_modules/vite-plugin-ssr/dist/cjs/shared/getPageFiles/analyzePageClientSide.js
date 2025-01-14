"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePageClientSideInit = exports.analyzePageClientSide = void 0;
const analyzeExports_js_1 = require("./analyzePageClientSide/analyzeExports.js");
const determineClientEntry_js_1 = require("./analyzePageClientSide/determineClientEntry.js");
const getAllPageIdFiles_js_1 = require("./getAllPageIdFiles.js");
const getAllPageIdFiles_js_2 = require("./getAllPageIdFiles.js");
const utils_js_1 = require("../utils.js");
const getExportNames_js_1 = require("./analyzePageClientSide/getExportNames.js");
// TODO/v1-release: remove analyzePageClientSide(), use analyzeClientSide() instead
function analyzePageClientSide(pageFilesAll, pageId) {
    let pageFilesClientSide = (0, getAllPageIdFiles_js_1.getPageFilesClientSide)(pageFilesAll, pageId);
    const pageFilesServerSide = (0, getAllPageIdFiles_js_2.getPageFilesServerSide)(pageFilesAll, pageId);
    const { isHtmlOnly, isClientRouting } = (0, analyzeExports_js_1.analyzeExports)({ pageFilesClientSide, pageFilesServerSide, pageId });
    if (isHtmlOnly) {
        // HTML-only pages don't need any client-side `render()` hook. For apps that have both HTML-only and SSR/SPA pages, we skip the `.page.client.js` file that defines `render()` for HTML-only pages.
        pageFilesClientSide = pageFilesClientSide.filter((p) => p.isEnv('CLIENT_ONLY') && !(0, getExportNames_js_1.getExportNames)(p).includes('render'));
        pageFilesClientSide = removeOverridenPageFiles(pageFilesClientSide);
    }
    const { clientEntries, clientDependencies } = (0, determineClientEntry_js_1.determineClientEntry)({
        pageFilesClientSide,
        pageFilesServerSide,
        isHtmlOnly,
        isClientRouting
    });
    return { isHtmlOnly, isClientRouting, clientEntries, clientDependencies, pageFilesClientSide, pageFilesServerSide };
}
exports.analyzePageClientSide = analyzePageClientSide;
// TODO:v1-release: remove
async function analyzePageClientSideInit(pageFilesAll, pageId, { sharedPageFilesAlreadyLoaded }) {
    const pageFilesClientSide = (0, getAllPageIdFiles_js_1.getPageFilesClientSide)(pageFilesAll, pageId);
    await Promise.all(pageFilesClientSide.map(async (p) => {
        (0, utils_js_1.assert)(p.isEnv('CLIENT_ONLY') || p.isEnv('CLIENT_AND_SERVER'));
        if (sharedPageFilesAlreadyLoaded && p.isEnv('CLIENT_AND_SERVER')) {
            return;
        }
        // TODO: Is `loadExportNames()` cached ? Does it use filesExports if possible? HMR?
        await p.loadExportNames?.();
        /*
        if (pageFile.exportNames) {
          return pageFile.exportNames.includes(clientRouting)
        }
        if (pageFile.fileExports) {
          return Object.keys(pageFile.fileExports).includes(clientRouting)
        }
        */
    }));
}
exports.analyzePageClientSideInit = analyzePageClientSideInit;
// [WIP] Just an experiment needed by https://vite-plugin-ssr.com/banner
//  - Not sure I want to make something like a public API: the CSS of `_default.page.server.js` are still loaded -> weird DX.
function removeOverridenPageFiles(pageFilesClientSide) {
    const pageFilesClientSide_ = [];
    for (const p of pageFilesClientSide) {
        pageFilesClientSide_.push(p);
        if ((0, getExportNames_js_1.getExportNames)(p).includes('overrideDefaultPages')) {
            break;
        }
    }
    return pageFilesClientSide_;
}
