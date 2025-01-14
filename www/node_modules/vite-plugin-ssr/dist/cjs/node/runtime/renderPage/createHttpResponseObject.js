"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpResponseObjectRedirect = exports.createHttpResponsePageContextJson = exports.createHttpResponseObject = void 0;
const utils_js_1 = require("../utils.js");
const error_page_js_1 = require("../../../shared/error-page.js");
const getHttpResponseBody_js_1 = require("./getHttpResponseBody.js");
const getEarlyHints_js_1 = require("./getEarlyHints.js");
const assertNoInfiniteHttpRedirect_js_1 = require("./createHttpResponseObject/assertNoInfiniteHttpRedirect.js");
async function createHttpResponseObject(htmlRender, renderHook, pageContext) {
    if (htmlRender === null) {
        return null;
    }
    let statusCode = pageContext.abortStatusCode;
    if (!statusCode) {
        const isError = !pageContext._pageId || (0, error_page_js_1.isErrorPage)(pageContext._pageId, pageContext._pageConfigs);
        if (pageContext.errorWhileRendering) {
            (0, utils_js_1.assert)(isError);
        }
        if (!isError) {
            (0, utils_js_1.assert)(pageContext.is404 === null);
            statusCode = 200;
        }
        else {
            (0, utils_js_1.assert)(pageContext.is404 === true || pageContext.is404 === false);
            statusCode = pageContext.is404 ? 404 : 500;
        }
    }
    const earlyHints = (0, getEarlyHints_js_1.getEarlyHints)(await pageContext.__getPageAssets());
    return getHttpResponse(statusCode, 'text/html;charset=utf-8', [], htmlRender, earlyHints, renderHook);
}
exports.createHttpResponseObject = createHttpResponseObject;
async function createHttpResponsePageContextJson(pageContextSerialized) {
    const httpResponse = getHttpResponse(200, 'application/json', [], pageContextSerialized, [], null);
    return httpResponse;
}
exports.createHttpResponsePageContextJson = createHttpResponsePageContextJson;
function createHttpResponseObjectRedirect({ url, statusCode }, 
// The URL pathname we assume the redirect to be logically based on
urlPathnameLogical) {
    (0, assertNoInfiniteHttpRedirect_js_1.assertNoInfiniteHttpRedirect)(url, urlPathnameLogical);
    (0, utils_js_1.assert)(url);
    (0, utils_js_1.assert)(statusCode);
    (0, utils_js_1.assert)(300 <= statusCode && statusCode <= 399);
    const headers = [['Location', url]];
    return getHttpResponse(statusCode, 'text/html;charset=utf-8', headers, 
    // For bots / programmatic crawlig: show what's going on.
    // For users: showing a blank page is probably better than a flickering text.
    `<p style="display: none">Redirecting to ${url}</p>`);
}
exports.createHttpResponseObjectRedirect = createHttpResponseObjectRedirect;
function getHttpResponse(statusCode, contentType, headers, htmlRender, earlyHints = [], renderHook = null) {
    headers.push(['Content-Type', contentType]);
    (0, utils_js_1.assert)(renderHook || typeof htmlRender === 'string');
    return {
        statusCode,
        headers,
        // TODO/v1-release: remove
        get contentType() {
            (0, utils_js_1.assertWarning)(false, 'pageContext.httpResponse.contentType is deprecated and will be removed in the next major release. Use pageContext.httpResponse.headers instead, see https://vite-plugin-ssr.com/migration/0.4.134', { onlyOnce: true });
            return contentType;
        },
        earlyHints,
        get body() {
            return (0, getHttpResponseBody_js_1.getHttpResponseBody)(htmlRender, renderHook);
        },
        ...(0, getHttpResponseBody_js_1.getHttpResponseBodyStreamHandlers)(htmlRender, renderHook)
    };
}
