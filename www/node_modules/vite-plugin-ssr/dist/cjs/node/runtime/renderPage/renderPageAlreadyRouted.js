"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRenderContext = exports.getPageContextInitEnhanced = exports.prerender404Page = exports.prerenderPage = exports.renderPageAlreadyRouted = void 0;
const error_page_js_1 = require("../../../shared/error-page.js");
const renderHtml_js_1 = require("../html/renderHtml.js");
const getPageFiles_js_1 = require("../../../shared/getPageFiles.js");
const utils_js_1 = require("../utils.js");
const serializePageContextClientSide_js_1 = require("../html/serializePageContextClientSide.js");
const addUrlComputedProps_js_1 = require("../../../shared/addUrlComputedProps.js");
const globalContext_js_1 = require("../globalContext.js");
const createHttpResponseObject_js_1 = require("./createHttpResponseObject.js");
const loadPageFilesServerSide_js_1 = require("./loadPageFilesServerSide.js");
const executeOnRenderHtmlHook_js_1 = require("./executeOnRenderHtmlHook.js");
const executeOnBeforeRenderHook_js_1 = require("./executeOnBeforeRenderHook.js");
const loggerRuntime_js_1 = require("./loggerRuntime.js");
const isNewError_js_1 = require("./isNewError.js");
const preparePageContextForUserConsumptionServerSide_js_1 = require("./preparePageContextForUserConsumptionServerSide.js");
const executeGuardHook_js_1 = require("../../../shared/route/executeGuardHook.js");
const loadPageRoutes_js_1 = require("../../../shared/route/loadPageRoutes.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function renderPageAlreadyRouted(pageContext) {
    // pageContext._pageId can either be the:
    //  - ID of the page matching the routing, or the
    //  - ID of the error page `_error.page.js`.
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContext, '_pageId', 'string'));
    const isError = pageContext.is404 || !!pageContext.errorWhileRendering;
    (0, utils_js_1.assert)(isError === (pageContext._pageId === (0, error_page_js_1.getErrorPageId)(pageContext._pageFilesAll, pageContext._pageConfigs)));
    (0, utils_js_1.objectAssign)(pageContext, await (0, loadPageFilesServerSide_js_1.loadPageFilesServerSide)(pageContext));
    if (!isError) {
        await (0, executeGuardHook_js_1.executeGuardHook)(pageContext, (pageContext) => (0, preparePageContextForUserConsumptionServerSide_js_1.preparePageContextForUserConsumptionServerSide)(pageContext));
    }
    if (!isError) {
        await (0, executeOnBeforeRenderHook_js_1.executeOnBeforeRenderHooks)(pageContext);
    }
    else {
        try {
            await (0, executeOnBeforeRenderHook_js_1.executeOnBeforeRenderHooks)(pageContext);
        }
        catch (err) {
            if ((0, isNewError_js_1.isNewError)(err, pageContext.errorWhileRendering)) {
                (0, loggerRuntime_js_1.logRuntimeError)(err, pageContext._httpRequestId);
            }
        }
    }
    if (pageContext.isClientSideNavigation) {
        if (isError) {
            (0, utils_js_1.objectAssign)(pageContext, { _isError: true });
        }
        const pageContextSerialized = (0, serializePageContextClientSide_js_1.serializePageContextClientSide)(pageContext);
        const httpResponse = await (0, createHttpResponseObject_js_1.createHttpResponsePageContextJson)(pageContextSerialized);
        (0, utils_js_1.objectAssign)(pageContext, { httpResponse });
        return pageContext;
    }
    const renderHookResult = await (0, executeOnRenderHtmlHook_js_1.executeOnRenderHtmlHook)(pageContext);
    if (renderHookResult.htmlRender === null) {
        (0, utils_js_1.objectAssign)(pageContext, { httpResponse: null });
        return pageContext;
    }
    else {
        const { htmlRender, renderHook } = renderHookResult;
        const httpResponse = await (0, createHttpResponseObject_js_1.createHttpResponseObject)(htmlRender, renderHook, pageContext);
        (0, utils_js_1.objectAssign)(pageContext, { httpResponse });
        return pageContext;
    }
}
exports.renderPageAlreadyRouted = renderPageAlreadyRouted;
async function prerenderPage(pageContext) {
    (0, utils_js_1.objectAssign)(pageContext, {
        isClientSideNavigation: false,
        _urlHandler: null
    });
    /* Should we execute the guard() hook upon pre-rendering? Is there a use case for this?
     *  - It isn't trivial to implement, as it requires to duplicate / factor out the isAbortError() handling
    await executeGuardHook(pageContext, (pageContext) => preparePageContextForUserConsumptionServerSide(pageContext))
    */
    await (0, executeOnBeforeRenderHook_js_1.executeOnBeforeRenderHooks)(pageContext);
    const { htmlRender, renderHook } = await (0, executeOnRenderHtmlHook_js_1.executeOnRenderHtmlHook)(pageContext);
    (0, utils_js_1.assertUsage)(htmlRender !== null, `Cannot pre-render ${picocolors_1.default.cyan(pageContext.urlOriginal)} because the ${renderHook.hookName}() hook defined by ${renderHook.hookFilePath} didn't return an HTML string.`);
    (0, utils_js_1.assert)(pageContext.isClientSideNavigation === false);
    const documentHtml = await (0, renderHtml_js_1.getHtmlString)(htmlRender);
    (0, utils_js_1.assert)(typeof documentHtml === 'string');
    if (!pageContext._usesClientRouter) {
        return { documentHtml, pageContextSerialized: null, pageContext };
    }
    else {
        const pageContextSerialized = (0, serializePageContextClientSide_js_1.serializePageContextClientSide)(pageContext);
        return { documentHtml, pageContextSerialized, pageContext };
    }
}
exports.prerenderPage = prerenderPage;
async function prerender404Page(renderContext, pageContextInit_) {
    const errorPageId = (0, error_page_js_1.getErrorPageId)(renderContext.pageFilesAll, renderContext.pageConfigs);
    if (!errorPageId) {
        return null;
    }
    const pageContext = {
        _pageId: errorPageId,
        _httpRequestId: null,
        _urlRewrite: null,
        is404: true,
        routeParams: {},
        // `prerender404Page()` is about generating `dist/client/404.html` for static hosts; there is no Client Routing.
        _usesClientRouter: false,
        _routeMatches: []
    };
    const pageContextInit = {
        urlOriginal: '/fake-404-url',
        ...pageContextInit_
    };
    {
        const pageContextInitEnhanced = getPageContextInitEnhanced(pageContextInit, renderContext);
        (0, utils_js_1.objectAssign)(pageContext, pageContextInitEnhanced);
    }
    (0, utils_js_1.objectAssign)(pageContext, await (0, loadPageFilesServerSide_js_1.loadPageFilesServerSide)(pageContext));
    return prerenderPage(pageContext);
}
exports.prerender404Page = prerender404Page;
function getPageContextInitEnhanced(pageContextInit, renderContext, { urlComputedPropsNonEnumerable = false, ssr: { urlRewrite, urlHandler, isClientSideNavigation } = {
    urlRewrite: null,
    urlHandler: null,
    isClientSideNavigation: false
} } = {}) {
    (0, utils_js_1.assert)(pageContextInit.urlOriginal);
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    const pageContextInitEnhanced = {
        ...pageContextInit,
        _objectCreatedByVitePluginSsr: true,
        // The following is defined on `pageContext` because we can eventually make these non-global (e.g. sot that two pages can have different includeAssetsImportedByServer settings)
        _baseServer: globalContext.baseServer,
        _baseAssets: globalContext.baseAssets,
        _includeAssetsImportedByServer: globalContext.includeAssetsImportedByServer,
        // TODO: use GloablContext instead
        _pageFilesAll: renderContext.pageFilesAll,
        _pageConfigs: renderContext.pageConfigs,
        _pageConfigGlobal: renderContext.pageConfigGlobal,
        _allPageIds: renderContext.allPageIds,
        _pageRoutes: renderContext.pageRoutes,
        _onBeforeRouteHook: renderContext.onBeforeRouteHook,
        _pageContextInit: pageContextInit,
        _urlRewrite: urlRewrite,
        _urlHandler: urlHandler,
        isClientSideNavigation
    };
    (0, addUrlComputedProps_js_1.addUrlComputedProps)(pageContextInitEnhanced, !urlComputedPropsNonEnumerable);
    return pageContextInitEnhanced;
}
exports.getPageContextInitEnhanced = getPageContextInitEnhanced;
// TODO: remove getRenderContext() in favor of getGlobalObject() + reloadGlobalContext()
// TODO: impl GlobalNodeContext + GlobalClientContext + GloablContext, and use GlobalContext instead of RenderContext
async function getRenderContext() {
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    const { pageFilesAll, allPageIds, pageConfigs, pageConfigGlobal } = await (0, getPageFiles_js_1.getPageFilesAll)(false, globalContext.isProduction);
    const { pageRoutes, onBeforeRouteHook } = await (0, loadPageRoutes_js_1.loadPageRoutes)(pageFilesAll, pageConfigs, pageConfigGlobal, allPageIds);
    assertNonMixedDesign(pageFilesAll, pageConfigs);
    const renderContext = {
        pageFilesAll: pageFilesAll,
        pageConfigs,
        pageConfigGlobal,
        allPageIds: allPageIds,
        pageRoutes,
        onBeforeRouteHook
    };
    return renderContext;
}
exports.getRenderContext = getRenderContext;
function assertNonMixedDesign(pageFilesAll, pageConfigs) {
    if (pageFilesAll.length === 0 || pageConfigs.length === 0)
        return;
    const indent = '- ';
    const v1Files = (0, utils_js_1.unique)(pageConfigs
        .map((p) => Object.values(p.configValues)
        .map(({ definedAtInfo }) => definedAtInfo)
        .filter(utils_js_1.isNotNullish)
        .map((definedAtInfo) => indent + definedAtInfo.filePath))
        .flat(2));
    (0, utils_js_1.assertUsage)(false, [
        'Mixing the new V1 design with the old V0.4 design is forbidden.',
        'V1 files:',
        ...v1Files,
        'V0.4 files:',
        ...pageFilesAll.map((p) => indent + p.filePath)
    ].join('\n'));
}
