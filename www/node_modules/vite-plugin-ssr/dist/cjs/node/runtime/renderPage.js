"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPage_addWrapper = exports.renderPage = void 0;
const renderPageAlreadyRouted_js_1 = require("./renderPage/renderPageAlreadyRouted.js");
const index_js_1 = require("../../shared/route/index.js");
const utils_js_1 = require("./utils.js");
const abort_js_1 = require("../../shared/route/abort.js");
const globalContext_js_1 = require("./globalContext.js");
const handlePageContextRequestUrl_js_1 = require("./renderPage/handlePageContextRequestUrl.js");
const createHttpResponseObject_js_1 = require("./renderPage/createHttpResponseObject.js");
const loggerRuntime_js_1 = require("./renderPage/loggerRuntime.js");
const isNewError_js_1 = require("./renderPage/isNewError.js");
const assertArguments_js_1 = require("./renderPage/assertArguments.js");
const index_js_2 = require("./renderPage/log404/index.js");
const isConfigInvalid_js_1 = require("./renderPage/isConfigInvalid.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const serializePageContextClientSide_js_1 = require("./html/serializePageContextClientSide.js");
const error_page_js_1 = require("../../shared/error-page.js");
const handleErrorWithoutErrorPage_js_1 = require("./renderPage/handleErrorWithoutErrorPage.js");
const loadPageFilesServerSide_js_1 = require("./renderPage/loadPageFilesServerSide.js");
const resolveRedirects_js_1 = require("../../shared/route/resolveRedirects.js");
const globalObject = (0, utils_js_1.getGlobalObject)('runtime/renderPage.ts', {
    httpRequestsCount: 0,
    pendingRequestsCount: 0
});
let renderPage_wrapper = async (_httpRequestId, ret) => ({
    pageContextReturn: await ret(),
    onRequestDone: () => { }
});
const renderPage_addWrapper = (wrapper) => {
    renderPage_wrapper = wrapper;
};
exports.renderPage_addWrapper = renderPage_addWrapper;
// `renderPage()` calls `renderPageNominal()` while ensuring that errors are `console.error(err)` instead of `throw err`, so that `vite-plugin-ssr` never triggers a server shut down. (Throwing an error in an Express.js middleware shuts down the whole Express.js server.)
async function renderPage(pageContextInit) {
    (0, assertArguments_js_1.assertArguments)(...arguments);
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContextInit, 'urlOriginal', 'string'));
    (0, utils_js_1.assertEnv)();
    if (skipRequest(pageContextInit.urlOriginal)) {
        const pageContextHttpReponseNull = getPageContextHttpResponseNull(pageContextInit);
        (0, utils_js_1.checkType)(pageContextHttpReponseNull);
        return pageContextHttpReponseNull;
    }
    const httpRequestId = getRequestId();
    const urlToShowToUser = pageContextInit.urlOriginal;
    logHttpRequest(urlToShowToUser, httpRequestId);
    globalObject.pendingRequestsCount++;
    const { pageContextReturn, onRequestDone } = await renderPage_wrapper(httpRequestId, () => renderPageAndPrepare(pageContextInit, httpRequestId));
    logHttpResponse(urlToShowToUser, httpRequestId, pageContextReturn);
    globalObject.pendingRequestsCount--;
    onRequestDone();
    (0, utils_js_1.checkType)(pageContextReturn);
    return pageContextReturn;
}
exports.renderPage = renderPage;
async function renderPageAndPrepare(pageContextInit, httpRequestId) {
    // Invalid config
    const handleInvalidConfig = () => {
        (0, loggerRuntime_js_1.logRuntimeInfo)?.(picocolors_1.default.bold(picocolors_1.default.red("Couldn't load configuration: see error above.")), httpRequestId, 'error');
        const pageContextHttpReponseNull = getPageContextHttpResponseNull(pageContextInit);
        return pageContextHttpReponseNull;
    };
    if (isConfigInvalid_js_1.isConfigInvalid) {
        return handleInvalidConfig();
    }
    // Prepare context
    let renderContext;
    try {
        await (0, globalContext_js_1.initGlobalContext)();
        renderContext = await (0, renderPageAlreadyRouted_js_1.getRenderContext)();
    }
    catch (err) {
        // Errors are expected since assertUsage() is used in both initGlobalContext() and getRenderContext().
        // initGlobalContext() and getRenderContext() don't call any user hooks => err isn't thrown from user code
        (0, utils_js_1.assert)(!(0, abort_js_1.isAbortError)(err));
        (0, loggerRuntime_js_1.logRuntimeError)(err, httpRequestId);
        const pageContextHttpReponseNull = getPageContextHttpResponseNullWithError(err, pageContextInit);
        return pageContextHttpReponseNull;
    }
    if (isConfigInvalid_js_1.isConfigInvalid) {
        return handleInvalidConfig();
    }
    else {
        // From now on, renderContext.pageConfigs contains all the configuration data; getVikeConfig() isn't called anymore for this request
    }
    {
        const pageContextHttpReponse = normalizeUrl(pageContextInit, httpRequestId);
        if (pageContextHttpReponse)
            return pageContextHttpReponse;
    }
    {
        const pageContextHttpReponse = getPermanentRedirect(pageContextInit, httpRequestId);
        if (pageContextHttpReponse)
            return pageContextHttpReponse;
    }
    return await renderPageAlreadyPrepared(pageContextInit, httpRequestId, renderContext, []);
}
async function renderPageAlreadyPrepared(pageContextInit, httpRequestId, renderContext, pageContextsFromRewrite) {
    (0, abort_js_1.assertNoInfiniteAbortLoop)(pageContextsFromRewrite.length, 
    // There doesn't seem to be a way to count the number of HTTP redirects (vite-plugin-ssr don't have access to the HTTP request headers/cookies)
    // https://stackoverflow.com/questions/9683007/detect-infinite-http-redirect-loop-on-server-side
    0);
    let pageContextNominalPageSuccess;
    let pageContextNominalPageInit = {};
    {
        const pageContextFromAllRewrites = (0, abort_js_1.getPageContextFromAllRewrites)(pageContextsFromRewrite);
        (0, utils_js_1.objectAssign)(pageContextNominalPageInit, pageContextFromAllRewrites);
    }
    {
        const pageContextInitEnhanced = getPageContextInitEnhancedSSR(pageContextInit, renderContext, pageContextNominalPageInit._urlRewrite, httpRequestId);
        (0, utils_js_1.objectAssign)(pageContextNominalPageInit, pageContextInitEnhanced);
    }
    let errNominalPage;
    {
        try {
            pageContextNominalPageSuccess = await renderPageNominal(pageContextNominalPageInit);
        }
        catch (err) {
            errNominalPage = err;
            (0, utils_js_1.assert)(errNominalPage);
            (0, loggerRuntime_js_1.logRuntimeError)(errNominalPage, httpRequestId);
        }
        if (!errNominalPage) {
            (0, utils_js_1.assert)(pageContextNominalPageSuccess === pageContextNominalPageInit);
        }
    }
    // Log upon 404
    if (pageContextNominalPageSuccess &&
        'is404' in pageContextNominalPageSuccess &&
        pageContextNominalPageSuccess.is404 === true) {
        await (0, index_js_2.log404)(pageContextNominalPageSuccess);
    }
    if (errNominalPage === undefined) {
        (0, utils_js_1.assert)(pageContextNominalPageSuccess);
        return pageContextNominalPageSuccess;
    }
    else {
        (0, utils_js_1.assert)(errNominalPage);
        (0, utils_js_1.assert)(pageContextNominalPageSuccess === undefined);
        (0, utils_js_1.assert)(pageContextNominalPageInit);
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContextNominalPageInit, 'urlOriginal', 'string'));
        const pageContextErrorPageInit = await getPageContextErrorPageInit(pageContextInit, errNominalPage, pageContextNominalPageInit, renderContext, httpRequestId);
        if ((0, abort_js_1.isAbortError)(errNominalPage)) {
            const handled = await handleAbortError(errNominalPage, pageContextsFromRewrite, pageContextInit, pageContextNominalPageInit, httpRequestId, renderContext, pageContextErrorPageInit);
            if (handled.pageContextReturn) {
                // - throw redirect()
                // - throw render(url)
                // - throw render(abortStatusCode) if .pageContext.json request
                return handled.pageContextReturn;
            }
            else {
                // - throw render(abortStatusCode) if not .pageContext.json request
            }
            Object.assign(pageContextErrorPageInit, handled.pageContextAbort);
        }
        {
            const errorPageId = (0, error_page_js_1.getErrorPageId)(renderContext.pageFilesAll, renderContext.pageConfigs);
            if (!errorPageId) {
                (0, utils_js_1.objectAssign)(pageContextErrorPageInit, { _pageId: null });
                return (0, handleErrorWithoutErrorPage_js_1.handleErrorWithoutErrorPage)(pageContextErrorPageInit);
            }
            else {
                (0, utils_js_1.objectAssign)(pageContextErrorPageInit, { _pageId: errorPageId });
            }
        }
        let pageContextErrorPage;
        try {
            pageContextErrorPage = await (0, renderPageAlreadyRouted_js_1.renderPageAlreadyRouted)(pageContextErrorPageInit);
        }
        catch (errErrorPage) {
            if ((0, abort_js_1.isAbortError)(errErrorPage)) {
                const handled = await handleAbortError(errErrorPage, pageContextsFromRewrite, pageContextInit, pageContextNominalPageInit, httpRequestId, renderContext, pageContextErrorPageInit);
                // throw render(abortStatusCode)
                if (!handled.pageContextReturn) {
                    const pageContextAbort = errErrorPage._pageContextAbort;
                    (0, utils_js_1.assertWarning)(false, `Failed to render error page because ${picocolors_1.default.cyan(pageContextAbort._abortCall)} was called: make sure ${picocolors_1.default.cyan(pageContextAbort._abortCaller)} doesn't occur while the error page is being rendered.`, { onlyOnce: false });
                    const pageContextHttpReponseNull = getPageContextHttpResponseNullWithError(errNominalPage, pageContextInit);
                    return pageContextHttpReponseNull;
                }
                // `throw redirect()` / `throw render(url)`
                return handled.pageContextReturn;
            }
            if ((0, isNewError_js_1.isNewError)(errErrorPage, errNominalPage)) {
                (0, loggerRuntime_js_1.logRuntimeError)(errErrorPage, httpRequestId);
            }
            const pageContextHttpReponseNull = getPageContextHttpResponseNullWithError(errNominalPage, pageContextInit);
            return pageContextHttpReponseNull;
        }
        return pageContextErrorPage;
    }
}
function logHttpRequest(urlToShowToUser, httpRequestId) {
    const clearErrors = globalObject.pendingRequestsCount === 0;
    (0, loggerRuntime_js_1.logRuntimeInfo)?.(`HTTP request: ${picocolors_1.default.bold(urlToShowToUser)}`, httpRequestId, 'info', clearErrors);
}
function logHttpResponse(urlToShowToUser, httpRequestId, pageContextReturn) {
    const statusCode = pageContextReturn.httpResponse?.statusCode ?? null;
    const isSuccess = statusCode !== null && statusCode >= 200 && statusCode <= 399;
    const isNominal = isSuccess || statusCode === 404;
    const color = (s) => picocolors_1.default.bold(isSuccess ? picocolors_1.default.green(String(s)) : picocolors_1.default.red(String(s)));
    const isRedirect = statusCode && 300 <= statusCode && statusCode <= 399;
    const type = isRedirect ? 'redirect' : 'response';
    if (isRedirect) {
        (0, utils_js_1.assert)(pageContextReturn.httpResponse);
        const headerRedirect = pageContextReturn.httpResponse.headers
            .slice()
            .reverse()
            .find((header) => header[0] === 'Location');
        (0, utils_js_1.assert)(headerRedirect);
        const urlRedirect = headerRedirect[1];
        urlToShowToUser = urlRedirect;
    }
    (0, loggerRuntime_js_1.logRuntimeInfo)?.(`HTTP ${type} ${picocolors_1.default.bold(urlToShowToUser)} ${color(statusCode ?? 'ERR')}`, httpRequestId, isNominal ? 'info' : 'error');
}
function getPageContextHttpResponseNullWithError(err, pageContextInit) {
    const pageContextHttpReponseNull = {};
    (0, utils_js_1.objectAssign)(pageContextHttpReponseNull, pageContextInit);
    (0, utils_js_1.objectAssign)(pageContextHttpReponseNull, {
        httpResponse: null,
        errorWhileRendering: err
    });
    return pageContextHttpReponseNull;
}
function getPageContextHttpResponseNull(pageContextInit) {
    const pageContextHttpReponseNull = {};
    (0, utils_js_1.objectAssign)(pageContextHttpReponseNull, pageContextInit);
    (0, utils_js_1.objectAssign)(pageContextHttpReponseNull, {
        httpResponse: null,
        errorWhileRendering: null
    });
    return pageContextHttpReponseNull;
}
async function renderPageNominal(pageContext) {
    (0, utils_js_1.objectAssign)(pageContext, { errorWhileRendering: null });
    // Check Base URL
    {
        const { urlWithoutPageContextRequestSuffix } = (0, handlePageContextRequestUrl_js_1.handlePageContextRequestUrl)(pageContext.urlOriginal);
        const hasBaseServer = (0, utils_js_1.parseUrl)(urlWithoutPageContextRequestSuffix, pageContext._baseServer).hasBaseServer || !!pageContext._urlRewrite;
        if (!hasBaseServer) {
            (0, utils_js_1.objectAssign)(pageContext, { httpResponse: null });
            return pageContext;
        }
    }
    // Route
    {
        const routeResult = await (0, index_js_1.route)(pageContext);
        (0, utils_js_1.objectAssign)(pageContext, routeResult.pageContextAddendum);
        (0, utils_js_1.objectAssign)(pageContext, { is404: pageContext._pageId ? null : true });
        if (pageContext._pageId === null) {
            const errorPageId = (0, error_page_js_1.getErrorPageId)(pageContext._pageFilesAll, pageContext._pageConfigs);
            if (!errorPageId) {
                (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContext, '_pageId', 'null'));
                return (0, handleErrorWithoutErrorPage_js_1.handleErrorWithoutErrorPage)(pageContext);
            }
            (0, utils_js_1.objectAssign)(pageContext, { _pageId: errorPageId });
        }
    }
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContext, '_pageId', 'string'));
    // Render
    const pageContextAfterRender = await (0, renderPageAlreadyRouted_js_1.renderPageAlreadyRouted)(pageContext);
    (0, utils_js_1.assert)(pageContext === pageContextAfterRender);
    return pageContextAfterRender;
}
async function getPageContextErrorPageInit(pageContextInit, errNominalPage, pageContextNominalPagePartial, renderContext, httpRequestId) {
    const pageContextInitEnhanced = getPageContextInitEnhancedSSR(pageContextInit, renderContext, null, httpRequestId);
    (0, utils_js_1.assert)(errNominalPage);
    const pageContext = {
        ...pageContextInitEnhanced,
        is404: false,
        errorWhileRendering: errNominalPage,
        routeParams: {}
    };
    (0, utils_js_1.objectAssign)(pageContext, {
        _routeMatches: pageContextNominalPagePartial._routeMatches || 'ROUTE_ERROR'
    });
    (0, utils_js_1.assert)(pageContext.errorWhileRendering);
    return pageContext;
}
function getPageContextInitEnhancedSSR(pageContextInit, renderContext, urlRewrite, httpRequestId) {
    const { isClientSideNavigation, _urlHandler } = handleUrl(pageContextInit.urlOriginal, urlRewrite);
    const pageContextInitEnhanced = (0, renderPageAlreadyRouted_js_1.getPageContextInitEnhanced)(pageContextInit, renderContext, {
        ssr: {
            urlRewrite,
            urlHandler: _urlHandler,
            isClientSideNavigation
        }
    });
    (0, utils_js_1.objectAssign)(pageContextInitEnhanced, { _httpRequestId: httpRequestId });
    return pageContextInitEnhanced;
}
function handleUrl(urlOriginal, urlRewrite) {
    (0, utils_js_1.assert)(isUrlValid(urlOriginal));
    (0, utils_js_1.assert)(urlRewrite === null || isUrlValid(urlRewrite));
    const { isPageContextRequest } = (0, handlePageContextRequestUrl_js_1.handlePageContextRequestUrl)(urlOriginal);
    const pageContextAddendum = {
        isClientSideNavigation: isPageContextRequest,
        _urlHandler: (url) => (0, handlePageContextRequestUrl_js_1.handlePageContextRequestUrl)(url).urlWithoutPageContextRequestSuffix
    };
    return pageContextAddendum;
}
function isUrlValid(url) {
    return url.startsWith('/') || url.startsWith('http');
}
function getRequestId() {
    const httpRequestId = ++globalObject.httpRequestsCount;
    (0, utils_js_1.assert)(httpRequestId >= 1);
    return httpRequestId;
}
function skipRequest(urlOriginal) {
    const isViteClientRequest = urlOriginal.endsWith('/@vite/client') || urlOriginal.startsWith('/@fs/');
    (0, utils_js_1.assertWarning)(!isViteClientRequest, `The vite-plugin-ssr middleware renderPage() was called with the URL ${urlOriginal} which is unexpected because the HTTP request should have already been handled by Vite's development middleware. Make sure to 1. install Vite's development middleware and 2. add Vite's middleware *before* vite-plugin-ssr's middleware, see https://vite-plugin-ssr.com/renderPage`, { onlyOnce: true });
    return (urlOriginal.endsWith('/__vite_ping') ||
        urlOriginal.endsWith('/favicon.ico') ||
        !(0, utils_js_1.isParsable)(urlOriginal) ||
        isViteClientRequest);
}
function normalizeUrl(pageContextInit, httpRequestId) {
    const { trailingSlash, disableUrlNormalization } = (0, globalContext_js_1.getGlobalContext)();
    if (disableUrlNormalization)
        return null;
    const { urlOriginal } = pageContextInit;
    const urlNormalized = (0, utils_js_1.normalizeUrlPathname)(urlOriginal, trailingSlash);
    if (!urlNormalized)
        return null;
    (0, loggerRuntime_js_1.logRuntimeInfo)?.(`URL normalized from ${picocolors_1.default.cyan(urlOriginal)} to ${picocolors_1.default.cyan(urlNormalized)} (https://vite-plugin-ssr.com/url-normalization)`, httpRequestId, 'info');
    const httpResponse = (0, createHttpResponseObject_js_1.createHttpResponseObjectRedirect)({ url: urlNormalized, statusCode: 301 }, pageContextInit.urlOriginal);
    const pageContextHttpResponse = { ...pageContextInit, httpResponse };
    return pageContextHttpResponse;
}
function getPermanentRedirect(pageContextInit, httpRequestId) {
    const { redirects, baseServer } = (0, globalContext_js_1.getGlobalContext)();
    const urlWithoutBase = (0, utils_js_1.removeBaseServer)(pageContextInit.urlOriginal, baseServer);
    let urlOriginalPathnameWithouBase;
    let origin = null;
    let urlTarget = (0, utils_js_1.modifyUrlPathname)(urlWithoutBase, (urlPathname) => {
        urlOriginalPathnameWithouBase = urlPathname;
        const urlTargetWithOrigin = (0, resolveRedirects_js_1.resolveRedirects)(redirects, urlPathname);
        if (urlTargetWithOrigin === null)
            return null;
        const { urlModified, origin: origin_ } = (0, utils_js_1.removeUrlOrigin)(urlTargetWithOrigin);
        origin = origin_;
        return urlModified;
    });
    if (origin)
        urlTarget = (0, utils_js_1.addUrlOrigin)(urlTarget, origin);
    (0, utils_js_1.assert)(urlOriginalPathnameWithouBase);
    if (urlTarget === urlWithoutBase)
        return null;
    (0, loggerRuntime_js_1.logRuntimeInfo)?.(`Permanent redirect defined by your config.redirects (https://vite-plugin-ssr.com/redirects)`, httpRequestId, 'info');
    urlTarget = (0, utils_js_1.prependBase)(urlTarget, baseServer);
    (0, utils_js_1.assert)(urlTarget !== pageContextInit.urlOriginal);
    const httpResponse = (0, createHttpResponseObject_js_1.createHttpResponseObjectRedirect)({ url: urlTarget, statusCode: 301 }, urlOriginalPathnameWithouBase);
    const pageContextHttpResponse = { ...pageContextInit, httpResponse };
    return pageContextHttpResponse;
}
async function handleAbortError(errAbort, pageContextsFromRewrite, pageContextInit, pageContextNominalPageInit, httpRequestId, renderContext, pageContextErrorPageInit) {
    (0, abort_js_1.logAbortErrorHandled)(errAbort, (0, globalContext_js_1.getGlobalContext)().isProduction, pageContextNominalPageInit);
    const pageContextAbort = errAbort._pageContextAbort;
    let pageContextSerialized;
    if (pageContextNominalPageInit.isClientSideNavigation) {
        if (pageContextAbort.abortStatusCode) {
            const errorPageId = (0, error_page_js_1.getErrorPageId)(renderContext.pageFilesAll, renderContext.pageConfigs);
            const abortCall = pageContextAbort._abortCall;
            (0, utils_js_1.assert)(abortCall);
            (0, utils_js_1.assertUsage)(errorPageId, `You called ${picocolors_1.default.cyan(abortCall)} but you didn't define an error page, make sure to define one https://vite-plugin-ssr.com/error-page`);
            const pageContext = {
                _pageId: errorPageId,
                ...pageContextAbort,
                ...pageContextErrorPageInit,
                ...renderContext
            };
            (0, utils_js_1.objectAssign)(pageContext, await (0, loadPageFilesServerSide_js_1.loadPageFilesServerSide)(pageContext));
            // We include pageContextInit: we don't only serialize pageContextAbort because the error page may need to access pageContextInit
            pageContextSerialized = (0, serializePageContextClientSide_js_1.serializePageContextClientSide)(pageContext);
        }
        else {
            pageContextSerialized = (0, serializePageContextClientSide_js_1.serializePageContextAbort)(pageContextAbort);
        }
        const httpResponse = await (0, createHttpResponseObject_js_1.createHttpResponsePageContextJson)(pageContextSerialized);
        const pageContextReturn = { httpResponse };
        return { pageContextReturn };
    }
    if (pageContextAbort._urlRewrite) {
        const pageContextReturn = await renderPageAlreadyPrepared(pageContextInit, httpRequestId, renderContext, [
            ...pageContextsFromRewrite,
            pageContextAbort
        ]);
        Object.assign(pageContextReturn, pageContextAbort);
        return { pageContextReturn };
    }
    if (pageContextAbort._urlRedirect) {
        const pageContextReturn = {
            ...pageContextInit,
            ...pageContextAbort
        };
        const httpResponse = (0, createHttpResponseObject_js_1.createHttpResponseObjectRedirect)(pageContextAbort._urlRedirect, pageContextNominalPageInit.urlPathname);
        (0, utils_js_1.objectAssign)(pageContextReturn, { httpResponse });
        return { pageContextReturn };
    }
    (0, utils_js_1.assert)(pageContextAbort.abortStatusCode);
    return { pageContextAbort };
}
