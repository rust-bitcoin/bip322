"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNoInfiniteAbortLoop = exports.AbortRender = exports.getPageContextFromAllRewrites = exports.logAbortErrorHandled = exports.isAbortPageContext = exports.isAbortError = exports.RenderErrorPage = exports.render = exports.redirect = void 0;
const utils_js_1 = require("./utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
/**
 * Abort the rendering of the current page, and redirect the user to another URL instead.
 *
 * https://vite-plugin-ssr.com/redirect
 *
 * @param url The URL to redirect to.
 * @param statusCode By default a temporary redirection (`302`) is performed. For permanent redirections (`301`), use `config.redirects` https://vite-plugin-ssr.com/redirects instead or, alternatively, set the `statusCode` argument to `301`.
 */
function redirect(url, statusCode) {
    const abortCaller = 'throw redirect()';
    const args = [JSON.stringify(url)];
    if (!statusCode) {
        statusCode = 302;
    }
    else {
        assertStatusCode(statusCode, [301, 302], 'redirect');
        args.push(String(statusCode));
    }
    const pageContextAbort = {};
    (0, utils_js_1.objectAssign)(pageContextAbort, {
        _abortCaller: abortCaller,
        _abortCall: `throw redirect(${args.join(', ')})`,
        _urlRedirect: {
            url,
            statusCode
        }
    });
    return AbortRender(pageContextAbort);
}
exports.redirect = redirect;
function render(value, abortReason) {
    const args = [typeof value === 'number' ? String(value) : JSON.stringify(value)];
    if (abortReason !== undefined)
        args.push((0, utils_js_1.truncateString)(JSON.stringify(abortReason), 30, null));
    const abortCaller = 'throw render()';
    const abortCall = `throw render(${args.join(', ')})`;
    return render_(value, abortReason, abortCall, abortCaller);
}
exports.render = render;
function render_(value, abortReason, abortCall, abortCaller, pageContextAddendum) {
    const pageContextAbort = {
        abortReason,
        _abortCaller: abortCaller,
        _abortCall: abortCall
    };
    if (pageContextAddendum) {
        (0, utils_js_1.assert)(pageContextAddendum._isLegacyRenderErrorPage === true);
        (0, utils_js_1.objectAssign)(pageContextAbort, pageContextAddendum);
    }
    if (typeof value === 'string') {
        const url = value;
        (0, utils_js_1.objectAssign)(pageContextAbort, {
            _urlRewrite: url
        });
        return AbortRender(pageContextAbort);
    }
    else {
        const abortStatusCode = value;
        assertStatusCode(value, [401, 403, 404, 410, 429, 500, 503], 'render');
        (0, utils_js_1.objectAssign)(pageContextAbort, {
            abortStatusCode,
            is404: abortStatusCode === 404
        });
        return AbortRender(pageContextAbort);
    }
}
function AbortRender(pageContextAbort) {
    const err = new Error('AbortRender');
    (0, utils_js_1.objectAssign)(err, { _pageContextAbort: pageContextAbort, [stamp]: true });
    (0, utils_js_1.checkType)(err);
    return err;
}
exports.AbortRender = AbortRender;
// TODO/v1-release: remove
/**
 * @deprecated Use `throw render()` or `throw redirect()` instead, see https://vite-plugin-ssr.com/render'
 */
function RenderErrorPage({ pageContext = {} } = {}) {
    (0, utils_js_1.assertWarning)(false, `${picocolors_1.default.cyan('throw RenderErrorPage()')} is deprecated and will be removed in the next major release. Use ${picocolors_1.default.cyan('throw render()')} or ${picocolors_1.default.cyan('throw redirect()')} instead, see https://vite-plugin-ssr.com/render`, { onlyOnce: false });
    let abortStatusCode = 404;
    let abortReason = 'Page Not Found';
    if (pageContext.is404 === false || pageContext.pageProps?.is404 === false) {
        abortStatusCode = 500;
        abortReason = 'Something went wrong';
    }
    (0, utils_js_1.objectAssign)(pageContext, { _isLegacyRenderErrorPage: true });
    return render_(abortStatusCode, abortReason, 'throw RenderErrorPage()', 'throw RenderErrorPage()', pageContext);
}
exports.RenderErrorPage = RenderErrorPage;
const stamp = '_isAbortError';
function isAbortError(thing) {
    return typeof thing === 'object' && thing !== null && stamp in thing;
}
exports.isAbortError = isAbortError;
function isAbortPageContext(pageContext) {
    if (!(pageContext._urlRewrite || pageContext._urlRedirect || pageContext.abortStatusCode)) {
        return false;
    }
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContext, '_abortCall', 'string'));
    /* Isn't needed and is missing on the client-side
    assert(hasProp(pageContext, '_abortCaller', 'string'))
    */
    (0, utils_js_1.checkType)(pageContext);
    return true;
}
exports.isAbortPageContext = isAbortPageContext;
function logAbortErrorHandled(err, isProduction, pageContext) {
    if (isProduction)
        return;
    const urlCurrent = pageContext._urlRewrite ?? pageContext.urlOriginal;
    (0, utils_js_1.assert)(urlCurrent);
    const abortCall = err._pageContextAbort._abortCall;
    (0, utils_js_1.assertInfo)(false, `${picocolors_1.default.cyan(abortCall)} intercepted while rendering ${picocolors_1.default.cyan(urlCurrent)}`, { onlyOnce: false });
}
exports.logAbortErrorHandled = logAbortErrorHandled;
function assertStatusCode(statusCode, expected, caller) {
    const expectedEnglish = (0, utils_js_1.joinEnglish)(expected.map((s) => s.toString()), 'or');
    (0, utils_js_1.assertWarning)(expected.includes(statusCode), `Unepexected status code ${statusCode} passed to ${caller}(), we recommend ${expectedEnglish} instead. (Or reach out at ${utils_js_1.projectInfo.githubRepository}/issues/1008 if you believe ${statusCode} should be added.)`, { onlyOnce: true });
}
function getPageContextFromAllRewrites(pageContextsFromRewrite) {
    assertNoInfiniteLoop(pageContextsFromRewrite);
    const pageContextFromAllRewrites = { _urlRewrite: null };
    pageContextsFromRewrite.forEach((pageContextFromRewrite) => {
        Object.assign(pageContextFromAllRewrites, pageContextFromRewrite);
    });
    return pageContextFromAllRewrites;
}
exports.getPageContextFromAllRewrites = getPageContextFromAllRewrites;
function assertNoInfiniteLoop(pageContextsFromRewrite) {
    const urlRewrites = [];
    pageContextsFromRewrite.forEach((pageContext) => {
        const urlRewrite = pageContext._urlRewrite;
        {
            const idx = urlRewrites.indexOf(urlRewrite);
            if (idx !== -1) {
                const loop = [...urlRewrites.slice(idx), urlRewrite].map((url) => `render('${url}')`).join(' => ');
                (0, utils_js_1.assertUsage)(false, `Infinite loop of render() calls: ${loop}`);
            }
        }
        urlRewrites.push(urlRewrite);
    });
}
function assertNoInfiniteAbortLoop(rewriteCount, redirectCount) {
    const abortCalls = [
        // prettier-ignore
        rewriteCount > 0 && picocolors_1.default.cyan("throw render('/some-url')"),
        redirectCount > 0 && picocolors_1.default.cyan("throw redirect('/some-url')")
    ]
        .filter(Boolean)
        .join(' and ');
    (0, utils_js_1.assertUsage)(rewriteCount + redirectCount <= 7, `Maximum chain length of 7 ${abortCalls} exceeded. Did you define an infinite loop of ${abortCalls}?`);
}
exports.assertNoInfiniteAbortLoop = assertNoInfiniteAbortLoop;
