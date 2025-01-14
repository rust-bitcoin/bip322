export { redirect };
export { render };
export { RenderErrorPage };
export { isAbortError };
export { isAbortPageContext };
export { logAbortErrorHandled };
export { getPageContextFromAllRewrites };
export { AbortRender };
export { assertNoInfiniteAbortLoop };
export type { RedirectStatusCode };
export type { AbortStatusCode };
export type { ErrorAbort };
export type { PageContextFromRewrite };
export type { UrlRedirect };
type RedirectStatusCode = number & Parameters<typeof redirect>[1];
type AbortStatusCode = number & Parameters<typeof render>[0];
type UrlRedirect = {
    url: string;
    statusCode: RedirectStatusCode;
};
type AbortRedirect = Error;
type AbortReason = Required<({
    abortReason?: unknown;
} & Vike.PageContext)['abortReason']>;
/**
 * Abort the rendering of the current page, and redirect the user to another URL instead.
 *
 * https://vite-plugin-ssr.com/redirect
 *
 * @param url The URL to redirect to.
 * @param statusCode By default a temporary redirection (`302`) is performed. For permanent redirections (`301`), use `config.redirects` https://vite-plugin-ssr.com/redirects instead or, alternatively, set the `statusCode` argument to `301`.
 */
declare function redirect(url: `/${string}` | `https://${string}` | `http://${string}`, statusCode?: 301 | 302): AbortRedirect;
/**
 * Abort the rendering of the current page, and render the error page instead.
 *
 * https://vite-plugin-ssr.com/render
 *
 * @param abortStatusCode
 * One of the following:
 *   `401` Unauthorized (user isn't logged in)
 *   `403` Forbidden (user is logged in but isn't allowed)
 *   `404` Not Found
 *   `410` Gone (use this instead of `404` if the page existed in the past, see https://github.com/brillout/vite-plugin-ssr/issues/1097#issuecomment-1695260887)
 *   `429` Too Many Requests (rate limiting)
 *   `500` Internal Server Error (app has a bug)
 *   `503` Service Unavailable (server is overloaded, a third-party API isn't responding)
 * @param abortReason Sets `pageContext.abortReason` which is used by the error page to show a message to the user, see https://vite-plugin-ssr.com/error-page
 */
declare function render(abortStatusCode: 401 | 403 | 404 | 410 | 429 | 500 | 503, abortReason?: AbortReason): Error;
/**
 * Abort the rendering of the current page, and render another page instead.
 *
 * https://vite-plugin-ssr.com/render
 *
 * @param url The URL to render.
 * @param abortReason Sets `pageContext.abortReason` which is used by the error page to show a message to the user, see https://vite-plugin-ssr.com/error-page
 */
declare function render(url: `/${string}`, abortReason?: AbortReason): Error;
type AbortCall = `throw redirect(${string})` | `throw render(${string})` | `throw RenderErrorPage()`;
type PageContextAbort = {
    _abortCall: AbortCall;
} & (({
    _abortCaller: 'throw redirect()';
    _urlRedirect: UrlRedirect;
} & Omit<AbortUndefined, '_urlRedirect'>) | ({
    _abortCaller: 'throw render()' | 'throw RenderErrorPage()';
    abortReason: undefined | unknown;
    _urlRewrite: string;
} & Omit<AbortUndefined, '_urlRewrite'>) | ({
    _abortCaller: 'throw render()' | 'throw RenderErrorPage()';
    abortReason: undefined | unknown;
    abortStatusCode: number;
} & Omit<AbortUndefined, 'abortStatusCode'>));
type AbortUndefined = {
    _urlRedirect?: undefined;
    _urlRewrite?: undefined;
    abortStatusCode?: undefined;
};
declare function AbortRender(pageContextAbort: PageContextAbort): Error;
/**
 * @deprecated Use `throw render()` or `throw redirect()` instead, see https://vite-plugin-ssr.com/render'
 */
declare function RenderErrorPage({ pageContext }?: {
    pageContext?: Record<string, unknown>;
}): Error;
type ErrorAbort = {
    _pageContextAbort: PageContextAbort;
};
declare function isAbortError(thing: unknown): thing is ErrorAbort;
declare function isAbortPageContext(pageContext: Record<string, unknown>): pageContext is PageContextAbort;
declare function logAbortErrorHandled(err: ErrorAbort, isProduction: boolean, pageContext: {
    urlOriginal: string;
    _urlRewrite: null | string;
}): void;
type PageContextFromRewrite = {
    _urlRewrite: string;
} & Record<string, unknown>;
type PageContextFromAllRewrites = {
    _urlRewrite: null | string;
} & Record<string, unknown>;
declare function getPageContextFromAllRewrites(pageContextsFromRewrite: PageContextFromRewrite[]): PageContextFromAllRewrites;
declare function assertNoInfiniteAbortLoop(rewriteCount: number, redirectCount: number): void;
