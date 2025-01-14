export { renderPage };
export { renderPage_addWrapper };
import { getRenderContext, getPageContextInitEnhanced, renderPageAlreadyRouted } from './renderPage/renderPageAlreadyRouted.js';
import { route } from '../../shared/route/index.js';
import { assert, hasProp, objectAssign, isParsable, parseUrl, assertEnv, assertWarning, getGlobalObject, checkType, assertUsage, normalizeUrlPathname, removeBaseServer, modifyUrlPathname, prependBase, removeUrlOrigin, addUrlOrigin } from './utils.js';
import { assertNoInfiniteAbortLoop, getPageContextFromAllRewrites, isAbortError, logAbortErrorHandled } from '../../shared/route/abort.js';
import { getGlobalContext, initGlobalContext } from './globalContext.js';
import { handlePageContextRequestUrl } from './renderPage/handlePageContextRequestUrl.js';
import { createHttpResponseObjectRedirect, createHttpResponsePageContextJson } from './renderPage/createHttpResponseObject.js';
import { logRuntimeError, logRuntimeInfo } from './renderPage/loggerRuntime.js';
import { isNewError } from './renderPage/isNewError.js';
import { assertArguments } from './renderPage/assertArguments.js';
import { log404 } from './renderPage/log404/index.js';
import { isConfigInvalid } from './renderPage/isConfigInvalid.js';
import pc from '@brillout/picocolors';
import { serializePageContextAbort, serializePageContextClientSide } from './html/serializePageContextClientSide.js';
import { getErrorPageId } from '../../shared/error-page.js';
import { handleErrorWithoutErrorPage } from './renderPage/handleErrorWithoutErrorPage.js';
import { loadPageFilesServerSide } from './renderPage/loadPageFilesServerSide.js';
import { resolveRedirects } from '../../shared/route/resolveRedirects.js';
const globalObject = getGlobalObject('runtime/renderPage.ts', {
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
// `renderPage()` calls `renderPageNominal()` while ensuring that errors are `console.error(err)` instead of `throw err`, so that `vite-plugin-ssr` never triggers a server shut down. (Throwing an error in an Express.js middleware shuts down the whole Express.js server.)
async function renderPage(pageContextInit) {
    assertArguments(...arguments);
    assert(hasProp(pageContextInit, 'urlOriginal', 'string'));
    assertEnv();
    if (skipRequest(pageContextInit.urlOriginal)) {
        const pageContextHttpReponseNull = getPageContextHttpResponseNull(pageContextInit);
        checkType(pageContextHttpReponseNull);
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
    checkType(pageContextReturn);
    return pageContextReturn;
}
async function renderPageAndPrepare(pageContextInit, httpRequestId) {
    // Invalid config
    const handleInvalidConfig = () => {
        logRuntimeInfo?.(pc.bold(pc.red("Couldn't load configuration: see error above.")), httpRequestId, 'error');
        const pageContextHttpReponseNull = getPageContextHttpResponseNull(pageContextInit);
        return pageContextHttpReponseNull;
    };
    if (isConfigInvalid) {
        return handleInvalidConfig();
    }
    // Prepare context
    let renderContext;
    try {
        await initGlobalContext();
        renderContext = await getRenderContext();
    }
    catch (err) {
        // Errors are expected since assertUsage() is used in both initGlobalContext() and getRenderContext().
        // initGlobalContext() and getRenderContext() don't call any user hooks => err isn't thrown from user code
        assert(!isAbortError(err));
        logRuntimeError(err, httpRequestId);
        const pageContextHttpReponseNull = getPageContextHttpResponseNullWithError(err, pageContextInit);
        return pageContextHttpReponseNull;
    }
    if (isConfigInvalid) {
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
    assertNoInfiniteAbortLoop(pageContextsFromRewrite.length, 
    // There doesn't seem to be a way to count the number of HTTP redirects (vite-plugin-ssr don't have access to the HTTP request headers/cookies)
    // https://stackoverflow.com/questions/9683007/detect-infinite-http-redirect-loop-on-server-side
    0);
    let pageContextNominalPageSuccess;
    let pageContextNominalPageInit = {};
    {
        const pageContextFromAllRewrites = getPageContextFromAllRewrites(pageContextsFromRewrite);
        objectAssign(pageContextNominalPageInit, pageContextFromAllRewrites);
    }
    {
        const pageContextInitEnhanced = getPageContextInitEnhancedSSR(pageContextInit, renderContext, pageContextNominalPageInit._urlRewrite, httpRequestId);
        objectAssign(pageContextNominalPageInit, pageContextInitEnhanced);
    }
    let errNominalPage;
    {
        try {
            pageContextNominalPageSuccess = await renderPageNominal(pageContextNominalPageInit);
        }
        catch (err) {
            errNominalPage = err;
            assert(errNominalPage);
            logRuntimeError(errNominalPage, httpRequestId);
        }
        if (!errNominalPage) {
            assert(pageContextNominalPageSuccess === pageContextNominalPageInit);
        }
    }
    // Log upon 404
    if (pageContextNominalPageSuccess &&
        'is404' in pageContextNominalPageSuccess &&
        pageContextNominalPageSuccess.is404 === true) {
        await log404(pageContextNominalPageSuccess);
    }
    if (errNominalPage === undefined) {
        assert(pageContextNominalPageSuccess);
        return pageContextNominalPageSuccess;
    }
    else {
        assert(errNominalPage);
        assert(pageContextNominalPageSuccess === undefined);
        assert(pageContextNominalPageInit);
        assert(hasProp(pageContextNominalPageInit, 'urlOriginal', 'string'));
        const pageContextErrorPageInit = await getPageContextErrorPageInit(pageContextInit, errNominalPage, pageContextNominalPageInit, renderContext, httpRequestId);
        if (isAbortError(errNominalPage)) {
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
            const errorPageId = getErrorPageId(renderContext.pageFilesAll, renderContext.pageConfigs);
            if (!errorPageId) {
                objectAssign(pageContextErrorPageInit, { _pageId: null });
                return handleErrorWithoutErrorPage(pageContextErrorPageInit);
            }
            else {
                objectAssign(pageContextErrorPageInit, { _pageId: errorPageId });
            }
        }
        let pageContextErrorPage;
        try {
            pageContextErrorPage = await renderPageAlreadyRouted(pageContextErrorPageInit);
        }
        catch (errErrorPage) {
            if (isAbortError(errErrorPage)) {
                const handled = await handleAbortError(errErrorPage, pageContextsFromRewrite, pageContextInit, pageContextNominalPageInit, httpRequestId, renderContext, pageContextErrorPageInit);
                // throw render(abortStatusCode)
                if (!handled.pageContextReturn) {
                    const pageContextAbort = errErrorPage._pageContextAbort;
                    assertWarning(false, `Failed to render error page because ${pc.cyan(pageContextAbort._abortCall)} was called: make sure ${pc.cyan(pageContextAbort._abortCaller)} doesn't occur while the error page is being rendered.`, { onlyOnce: false });
                    const pageContextHttpReponseNull = getPageContextHttpResponseNullWithError(errNominalPage, pageContextInit);
                    return pageContextHttpReponseNull;
                }
                // `throw redirect()` / `throw render(url)`
                return handled.pageContextReturn;
            }
            if (isNewError(errErrorPage, errNominalPage)) {
                logRuntimeError(errErrorPage, httpRequestId);
            }
            const pageContextHttpReponseNull = getPageContextHttpResponseNullWithError(errNominalPage, pageContextInit);
            return pageContextHttpReponseNull;
        }
        return pageContextErrorPage;
    }
}
function logHttpRequest(urlToShowToUser, httpRequestId) {
    const clearErrors = globalObject.pendingRequestsCount === 0;
    logRuntimeInfo?.(`HTTP request: ${pc.bold(urlToShowToUser)}`, httpRequestId, 'info', clearErrors);
}
function logHttpResponse(urlToShowToUser, httpRequestId, pageContextReturn) {
    const statusCode = pageContextReturn.httpResponse?.statusCode ?? null;
    const isSuccess = statusCode !== null && statusCode >= 200 && statusCode <= 399;
    const isNominal = isSuccess || statusCode === 404;
    const color = (s) => pc.bold(isSuccess ? pc.green(String(s)) : pc.red(String(s)));
    const isRedirect = statusCode && 300 <= statusCode && statusCode <= 399;
    const type = isRedirect ? 'redirect' : 'response';
    if (isRedirect) {
        assert(pageContextReturn.httpResponse);
        const headerRedirect = pageContextReturn.httpResponse.headers
            .slice()
            .reverse()
            .find((header) => header[0] === 'Location');
        assert(headerRedirect);
        const urlRedirect = headerRedirect[1];
        urlToShowToUser = urlRedirect;
    }
    logRuntimeInfo?.(`HTTP ${type} ${pc.bold(urlToShowToUser)} ${color(statusCode ?? 'ERR')}`, httpRequestId, isNominal ? 'info' : 'error');
}
function getPageContextHttpResponseNullWithError(err, pageContextInit) {
    const pageContextHttpReponseNull = {};
    objectAssign(pageContextHttpReponseNull, pageContextInit);
    objectAssign(pageContextHttpReponseNull, {
        httpResponse: null,
        errorWhileRendering: err
    });
    return pageContextHttpReponseNull;
}
function getPageContextHttpResponseNull(pageContextInit) {
    const pageContextHttpReponseNull = {};
    objectAssign(pageContextHttpReponseNull, pageContextInit);
    objectAssign(pageContextHttpReponseNull, {
        httpResponse: null,
        errorWhileRendering: null
    });
    return pageContextHttpReponseNull;
}
async function renderPageNominal(pageContext) {
    objectAssign(pageContext, { errorWhileRendering: null });
    // Check Base URL
    {
        const { urlWithoutPageContextRequestSuffix } = handlePageContextRequestUrl(pageContext.urlOriginal);
        const hasBaseServer = parseUrl(urlWithoutPageContextRequestSuffix, pageContext._baseServer).hasBaseServer || !!pageContext._urlRewrite;
        if (!hasBaseServer) {
            objectAssign(pageContext, { httpResponse: null });
            return pageContext;
        }
    }
    // Route
    {
        const routeResult = await route(pageContext);
        objectAssign(pageContext, routeResult.pageContextAddendum);
        objectAssign(pageContext, { is404: pageContext._pageId ? null : true });
        if (pageContext._pageId === null) {
            const errorPageId = getErrorPageId(pageContext._pageFilesAll, pageContext._pageConfigs);
            if (!errorPageId) {
                assert(hasProp(pageContext, '_pageId', 'null'));
                return handleErrorWithoutErrorPage(pageContext);
            }
            objectAssign(pageContext, { _pageId: errorPageId });
        }
    }
    assert(hasProp(pageContext, '_pageId', 'string'));
    // Render
    const pageContextAfterRender = await renderPageAlreadyRouted(pageContext);
    assert(pageContext === pageContextAfterRender);
    return pageContextAfterRender;
}
async function getPageContextErrorPageInit(pageContextInit, errNominalPage, pageContextNominalPagePartial, renderContext, httpRequestId) {
    const pageContextInitEnhanced = getPageContextInitEnhancedSSR(pageContextInit, renderContext, null, httpRequestId);
    assert(errNominalPage);
    const pageContext = {
        ...pageContextInitEnhanced,
        is404: false,
        errorWhileRendering: errNominalPage,
        routeParams: {}
    };
    objectAssign(pageContext, {
        _routeMatches: pageContextNominalPagePartial._routeMatches || 'ROUTE_ERROR'
    });
    assert(pageContext.errorWhileRendering);
    return pageContext;
}
function getPageContextInitEnhancedSSR(pageContextInit, renderContext, urlRewrite, httpRequestId) {
    const { isClientSideNavigation, _urlHandler } = handleUrl(pageContextInit.urlOriginal, urlRewrite);
    const pageContextInitEnhanced = getPageContextInitEnhanced(pageContextInit, renderContext, {
        ssr: {
            urlRewrite,
            urlHandler: _urlHandler,
            isClientSideNavigation
        }
    });
    objectAssign(pageContextInitEnhanced, { _httpRequestId: httpRequestId });
    return pageContextInitEnhanced;
}
function handleUrl(urlOriginal, urlRewrite) {
    assert(isUrlValid(urlOriginal));
    assert(urlRewrite === null || isUrlValid(urlRewrite));
    const { isPageContextRequest } = handlePageContextRequestUrl(urlOriginal);
    const pageContextAddendum = {
        isClientSideNavigation: isPageContextRequest,
        _urlHandler: (url) => handlePageContextRequestUrl(url).urlWithoutPageContextRequestSuffix
    };
    return pageContextAddendum;
}
function isUrlValid(url) {
    return url.startsWith('/') || url.startsWith('http');
}
function getRequestId() {
    const httpRequestId = ++globalObject.httpRequestsCount;
    assert(httpRequestId >= 1);
    return httpRequestId;
}
function skipRequest(urlOriginal) {
    const isViteClientRequest = urlOriginal.endsWith('/@vite/client') || urlOriginal.startsWith('/@fs/');
    assertWarning(!isViteClientRequest, `The vite-plugin-ssr middleware renderPage() was called with the URL ${urlOriginal} which is unexpected because the HTTP request should have already been handled by Vite's development middleware. Make sure to 1. install Vite's development middleware and 2. add Vite's middleware *before* vite-plugin-ssr's middleware, see https://vite-plugin-ssr.com/renderPage`, { onlyOnce: true });
    return (urlOriginal.endsWith('/__vite_ping') ||
        urlOriginal.endsWith('/favicon.ico') ||
        !isParsable(urlOriginal) ||
        isViteClientRequest);
}
function normalizeUrl(pageContextInit, httpRequestId) {
    const { trailingSlash, disableUrlNormalization } = getGlobalContext();
    if (disableUrlNormalization)
        return null;
    const { urlOriginal } = pageContextInit;
    const urlNormalized = normalizeUrlPathname(urlOriginal, trailingSlash);
    if (!urlNormalized)
        return null;
    logRuntimeInfo?.(`URL normalized from ${pc.cyan(urlOriginal)} to ${pc.cyan(urlNormalized)} (https://vite-plugin-ssr.com/url-normalization)`, httpRequestId, 'info');
    const httpResponse = createHttpResponseObjectRedirect({ url: urlNormalized, statusCode: 301 }, pageContextInit.urlOriginal);
    const pageContextHttpResponse = { ...pageContextInit, httpResponse };
    return pageContextHttpResponse;
}
function getPermanentRedirect(pageContextInit, httpRequestId) {
    const { redirects, baseServer } = getGlobalContext();
    const urlWithoutBase = removeBaseServer(pageContextInit.urlOriginal, baseServer);
    let urlOriginalPathnameWithouBase;
    let origin = null;
    let urlTarget = modifyUrlPathname(urlWithoutBase, (urlPathname) => {
        urlOriginalPathnameWithouBase = urlPathname;
        const urlTargetWithOrigin = resolveRedirects(redirects, urlPathname);
        if (urlTargetWithOrigin === null)
            return null;
        const { urlModified, origin: origin_ } = removeUrlOrigin(urlTargetWithOrigin);
        origin = origin_;
        return urlModified;
    });
    if (origin)
        urlTarget = addUrlOrigin(urlTarget, origin);
    assert(urlOriginalPathnameWithouBase);
    if (urlTarget === urlWithoutBase)
        return null;
    logRuntimeInfo?.(`Permanent redirect defined by your config.redirects (https://vite-plugin-ssr.com/redirects)`, httpRequestId, 'info');
    urlTarget = prependBase(urlTarget, baseServer);
    assert(urlTarget !== pageContextInit.urlOriginal);
    const httpResponse = createHttpResponseObjectRedirect({ url: urlTarget, statusCode: 301 }, urlOriginalPathnameWithouBase);
    const pageContextHttpResponse = { ...pageContextInit, httpResponse };
    return pageContextHttpResponse;
}
async function handleAbortError(errAbort, pageContextsFromRewrite, pageContextInit, pageContextNominalPageInit, httpRequestId, renderContext, pageContextErrorPageInit) {
    logAbortErrorHandled(errAbort, getGlobalContext().isProduction, pageContextNominalPageInit);
    const pageContextAbort = errAbort._pageContextAbort;
    let pageContextSerialized;
    if (pageContextNominalPageInit.isClientSideNavigation) {
        if (pageContextAbort.abortStatusCode) {
            const errorPageId = getErrorPageId(renderContext.pageFilesAll, renderContext.pageConfigs);
            const abortCall = pageContextAbort._abortCall;
            assert(abortCall);
            assertUsage(errorPageId, `You called ${pc.cyan(abortCall)} but you didn't define an error page, make sure to define one https://vite-plugin-ssr.com/error-page`);
            const pageContext = {
                _pageId: errorPageId,
                ...pageContextAbort,
                ...pageContextErrorPageInit,
                ...renderContext
            };
            objectAssign(pageContext, await loadPageFilesServerSide(pageContext));
            // We include pageContextInit: we don't only serialize pageContextAbort because the error page may need to access pageContextInit
            pageContextSerialized = serializePageContextClientSide(pageContext);
        }
        else {
            pageContextSerialized = serializePageContextAbort(pageContextAbort);
        }
        const httpResponse = await createHttpResponsePageContextJson(pageContextSerialized);
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
        const httpResponse = createHttpResponseObjectRedirect(pageContextAbort._urlRedirect, pageContextNominalPageInit.urlPathname);
        objectAssign(pageContextReturn, { httpResponse });
        return { pageContextReturn };
    }
    assert(pageContextAbort.abortStatusCode);
    return { pageContextAbort };
}
