export { createHttpResponseObject };
export { createHttpResponsePageContextJson };
export { createHttpResponseObjectRedirect };
import { assert, assertWarning } from '../utils.js';
import { isErrorPage } from '../../../shared/error-page.js';
import { getHttpResponseBody, getHttpResponseBodyStreamHandlers } from './getHttpResponseBody.js';
import { getEarlyHints } from './getEarlyHints.js';
import { assertNoInfiniteHttpRedirect } from './createHttpResponseObject/assertNoInfiniteHttpRedirect.js';
async function createHttpResponseObject(htmlRender, renderHook, pageContext) {
    if (htmlRender === null) {
        return null;
    }
    let statusCode = pageContext.abortStatusCode;
    if (!statusCode) {
        const isError = !pageContext._pageId || isErrorPage(pageContext._pageId, pageContext._pageConfigs);
        if (pageContext.errorWhileRendering) {
            assert(isError);
        }
        if (!isError) {
            assert(pageContext.is404 === null);
            statusCode = 200;
        }
        else {
            assert(pageContext.is404 === true || pageContext.is404 === false);
            statusCode = pageContext.is404 ? 404 : 500;
        }
    }
    const earlyHints = getEarlyHints(await pageContext.__getPageAssets());
    return getHttpResponse(statusCode, 'text/html;charset=utf-8', [], htmlRender, earlyHints, renderHook);
}
async function createHttpResponsePageContextJson(pageContextSerialized) {
    const httpResponse = getHttpResponse(200, 'application/json', [], pageContextSerialized, [], null);
    return httpResponse;
}
function createHttpResponseObjectRedirect({ url, statusCode }, 
// The URL pathname we assume the redirect to be logically based on
urlPathnameLogical) {
    assertNoInfiniteHttpRedirect(url, urlPathnameLogical);
    assert(url);
    assert(statusCode);
    assert(300 <= statusCode && statusCode <= 399);
    const headers = [['Location', url]];
    return getHttpResponse(statusCode, 'text/html;charset=utf-8', headers, 
    // For bots / programmatic crawlig: show what's going on.
    // For users: showing a blank page is probably better than a flickering text.
    `<p style="display: none">Redirecting to ${url}</p>`);
}
function getHttpResponse(statusCode, contentType, headers, htmlRender, earlyHints = [], renderHook = null) {
    headers.push(['Content-Type', contentType]);
    assert(renderHook || typeof htmlRender === 'string');
    return {
        statusCode,
        headers,
        // TODO/v1-release: remove
        get contentType() {
            assertWarning(false, 'pageContext.httpResponse.contentType is deprecated and will be removed in the next major release. Use pageContext.httpResponse.headers instead, see https://vite-plugin-ssr.com/migration/0.4.134', { onlyOnce: true });
            return contentType;
        },
        earlyHints,
        get body() {
            return getHttpResponseBody(htmlRender, renderHook);
        },
        ...getHttpResponseBodyStreamHandlers(htmlRender, renderHook)
    };
}
