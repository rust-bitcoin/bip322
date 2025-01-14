export { redirect };
export { render };
export { RenderErrorPage };
export { isAbortError };
export { isAbortPageContext };
export { logAbortErrorHandled };
export { getPageContextFromAllRewrites };
export { AbortRender };
export { assertNoInfiniteAbortLoop };
import { assert, assertInfo, assertUsage, assertWarning, checkType, hasProp, joinEnglish, objectAssign, projectInfo, truncateString } from './utils.js';
import pc from '@brillout/picocolors';
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
    objectAssign(pageContextAbort, {
        _abortCaller: abortCaller,
        _abortCall: `throw redirect(${args.join(', ')})`,
        _urlRedirect: {
            url,
            statusCode
        }
    });
    return AbortRender(pageContextAbort);
}
function render(value, abortReason) {
    const args = [typeof value === 'number' ? String(value) : JSON.stringify(value)];
    if (abortReason !== undefined)
        args.push(truncateString(JSON.stringify(abortReason), 30, null));
    const abortCaller = 'throw render()';
    const abortCall = `throw render(${args.join(', ')})`;
    return render_(value, abortReason, abortCall, abortCaller);
}
function render_(value, abortReason, abortCall, abortCaller, pageContextAddendum) {
    const pageContextAbort = {
        abortReason,
        _abortCaller: abortCaller,
        _abortCall: abortCall
    };
    if (pageContextAddendum) {
        assert(pageContextAddendum._isLegacyRenderErrorPage === true);
        objectAssign(pageContextAbort, pageContextAddendum);
    }
    if (typeof value === 'string') {
        const url = value;
        objectAssign(pageContextAbort, {
            _urlRewrite: url
        });
        return AbortRender(pageContextAbort);
    }
    else {
        const abortStatusCode = value;
        assertStatusCode(value, [401, 403, 404, 410, 429, 500, 503], 'render');
        objectAssign(pageContextAbort, {
            abortStatusCode,
            is404: abortStatusCode === 404
        });
        return AbortRender(pageContextAbort);
    }
}
function AbortRender(pageContextAbort) {
    const err = new Error('AbortRender');
    objectAssign(err, { _pageContextAbort: pageContextAbort, [stamp]: true });
    checkType(err);
    return err;
}
// TODO/v1-release: remove
/**
 * @deprecated Use `throw render()` or `throw redirect()` instead, see https://vite-plugin-ssr.com/render'
 */
function RenderErrorPage({ pageContext = {} } = {}) {
    assertWarning(false, `${pc.cyan('throw RenderErrorPage()')} is deprecated and will be removed in the next major release. Use ${pc.cyan('throw render()')} or ${pc.cyan('throw redirect()')} instead, see https://vite-plugin-ssr.com/render`, { onlyOnce: false });
    let abortStatusCode = 404;
    let abortReason = 'Page Not Found';
    if (pageContext.is404 === false || pageContext.pageProps?.is404 === false) {
        abortStatusCode = 500;
        abortReason = 'Something went wrong';
    }
    objectAssign(pageContext, { _isLegacyRenderErrorPage: true });
    return render_(abortStatusCode, abortReason, 'throw RenderErrorPage()', 'throw RenderErrorPage()', pageContext);
}
const stamp = '_isAbortError';
function isAbortError(thing) {
    return typeof thing === 'object' && thing !== null && stamp in thing;
}
function isAbortPageContext(pageContext) {
    if (!(pageContext._urlRewrite || pageContext._urlRedirect || pageContext.abortStatusCode)) {
        return false;
    }
    assert(hasProp(pageContext, '_abortCall', 'string'));
    /* Isn't needed and is missing on the client-side
    assert(hasProp(pageContext, '_abortCaller', 'string'))
    */
    checkType(pageContext);
    return true;
}
function logAbortErrorHandled(err, isProduction, pageContext) {
    if (isProduction)
        return;
    const urlCurrent = pageContext._urlRewrite ?? pageContext.urlOriginal;
    assert(urlCurrent);
    const abortCall = err._pageContextAbort._abortCall;
    assertInfo(false, `${pc.cyan(abortCall)} intercepted while rendering ${pc.cyan(urlCurrent)}`, { onlyOnce: false });
}
function assertStatusCode(statusCode, expected, caller) {
    const expectedEnglish = joinEnglish(expected.map((s) => s.toString()), 'or');
    assertWarning(expected.includes(statusCode), `Unepexected status code ${statusCode} passed to ${caller}(), we recommend ${expectedEnglish} instead. (Or reach out at ${projectInfo.githubRepository}/issues/1008 if you believe ${statusCode} should be added.)`, { onlyOnce: true });
}
function getPageContextFromAllRewrites(pageContextsFromRewrite) {
    assertNoInfiniteLoop(pageContextsFromRewrite);
    const pageContextFromAllRewrites = { _urlRewrite: null };
    pageContextsFromRewrite.forEach((pageContextFromRewrite) => {
        Object.assign(pageContextFromAllRewrites, pageContextFromRewrite);
    });
    return pageContextFromAllRewrites;
}
function assertNoInfiniteLoop(pageContextsFromRewrite) {
    const urlRewrites = [];
    pageContextsFromRewrite.forEach((pageContext) => {
        const urlRewrite = pageContext._urlRewrite;
        {
            const idx = urlRewrites.indexOf(urlRewrite);
            if (idx !== -1) {
                const loop = [...urlRewrites.slice(idx), urlRewrite].map((url) => `render('${url}')`).join(' => ');
                assertUsage(false, `Infinite loop of render() calls: ${loop}`);
            }
        }
        urlRewrites.push(urlRewrite);
    });
}
function assertNoInfiniteAbortLoop(rewriteCount, redirectCount) {
    const abortCalls = [
        // prettier-ignore
        rewriteCount > 0 && pc.cyan("throw render('/some-url')"),
        redirectCount > 0 && pc.cyan("throw redirect('/some-url')")
    ]
        .filter(Boolean)
        .join(' and ');
    assertUsage(rewriteCount + redirectCount <= 7, `Maximum chain length of 7 ${abortCalls} exceeded. Did you define an infinite loop of ${abortCalls}?`);
}
