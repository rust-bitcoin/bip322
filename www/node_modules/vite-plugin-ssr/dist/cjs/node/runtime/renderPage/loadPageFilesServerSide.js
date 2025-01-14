"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPageFilesServerSide = void 0;
const getPageFiles_js_1 = require("../../../shared/getPageFiles.js");
const analyzePageClientSide_js_1 = require("../../../shared/getPageFiles/analyzePageClientSide.js");
const utils_js_1 = require("../utils.js");
const getPageAssets_js_1 = require("./getPageAssets.js");
const debugPageFiles_js_1 = require("./debugPageFiles.js");
const findPageConfig_js_1 = require("../../../shared/page-configs/findPageConfig.js");
const analyzePage_js_1 = require("./analyzePage.js");
const globalContext_js_1 = require("../globalContext.js");
const loadPageCode_js_1 = require("../../../shared/page-configs/loadPageCode.js");
async function loadPageFilesServerSide(pageContext) {
    const pageConfig = (0, findPageConfig_js_1.findPageConfig)(pageContext._pageConfigs, pageContext._pageId); // Make pageConfig globally available as pageContext._pageConfig?
    const [{ config, configEntries, exports, exportsAll, pageExports, pageFilesLoaded, pageConfigLoaded }] = await Promise.all([
        loadPageFiles(pageContext._pageFilesAll, pageConfig, pageContext._pageId, !(0, globalContext_js_1.getGlobalContext)().isProduction),
        (0, analyzePageClientSide_js_1.analyzePageClientSideInit)(pageContext._pageFilesAll, pageContext._pageId, { sharedPageFilesAlreadyLoaded: true })
    ]);
    const { isHtmlOnly, isClientRouting, clientEntries, clientDependencies, pageFilesClientSide, pageFilesServerSide } = (0, analyzePage_js_1.analyzePage)(pageContext._pageFilesAll, pageConfig, pageContext._pageId);
    const pageContextAddendum = {};
    (0, utils_js_1.objectAssign)(pageContextAddendum, {
        config,
        configEntries,
        exports,
        exportsAll,
        pageExports,
        Page: exports.Page,
        _isHtmlOnly: isHtmlOnly,
        _passToClient: (0, getPageFiles_js_1.getExportUnion)(exportsAll, 'passToClient'),
        _pageFilePathsLoaded: pageFilesLoaded.map((p) => p.filePath)
    });
    (0, utils_js_1.objectAssign)(pageContextAddendum, {
        __getPageAssets: async () => {
            if ('_pageAssets' in pageContext) {
                return pageContext._pageAssets;
            }
            else {
                const pageAssets = await (0, getPageAssets_js_1.getPageAssets)(pageContext, clientDependencies, clientEntries);
                (0, utils_js_1.objectAssign)(pageContext, { _pageAssets: pageAssets });
                return pageContext._pageAssets;
            }
        }
    });
    // TODO/v1-release: remove
    Object.assign(pageContextAddendum, {
        _getPageAssets: async () => {
            (0, utils_js_1.assertWarning)(false, 'pageContext._getPageAssets() deprecated, see https://vite-plugin-ssr.com/preload', {
                onlyOnce: true,
                showStackTrace: true
            });
            const pageAssetsOldFormat = [];
            (await pageContextAddendum.__getPageAssets()).forEach((p) => {
                if (p.assetType === 'script' && p.isEntry) {
                    pageAssetsOldFormat.push({
                        src: p.src,
                        preloadType: null,
                        assetType: 'script',
                        mediaType: p.mediaType
                    });
                }
                pageAssetsOldFormat.push({
                    src: p.src,
                    preloadType: p.assetType,
                    assetType: p.assetType === 'style' ? 'style' : 'preload',
                    mediaType: p.mediaType
                });
            });
            return pageAssetsOldFormat;
        }
    });
    {
        (0, debugPageFiles_js_1.debugPageFiles)({
            pageContext,
            isHtmlOnly,
            isClientRouting,
            pageFilesLoaded,
            pageFilesClientSide,
            pageFilesServerSide,
            clientEntries,
            clientDependencies
        });
    }
    return pageContextAddendum;
}
exports.loadPageFilesServerSide = loadPageFilesServerSide;
async function loadPageFiles(pageFilesAll, pageConfig, pageId, isDev) {
    const pageFilesServerSide = (0, getPageFiles_js_1.getPageFilesServerSide)(pageFilesAll, pageId);
    const pageConfigLoaded = !pageConfig ? null : await (0, loadPageCode_js_1.loadPageCode)(pageConfig, isDev);
    await Promise.all(pageFilesServerSide.map((p) => p.loadFile?.()));
    const { config, configEntries, exports, exportsAll, pageExports } = (0, getPageFiles_js_1.getExports)(pageFilesServerSide, pageConfigLoaded);
    return {
        config,
        configEntries,
        exports,
        exportsAll,
        pageExports,
        pageFilesLoaded: pageFilesServerSide,
        pageConfigLoaded
    };
}
