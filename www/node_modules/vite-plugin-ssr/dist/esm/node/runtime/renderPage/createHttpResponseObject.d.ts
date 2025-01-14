export { createHttpResponseObject };
export { createHttpResponsePageContextJson };
export { createHttpResponseObjectRedirect };
export type { HttpResponse };
import type { GetPageAssets } from './getPageAssets.js';
import type { HtmlRender } from '../html/renderHtml.js';
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
import type { RenderHook } from './executeOnRenderHtmlHook.js';
import type { RedirectStatusCode, AbortStatusCode, UrlRedirect } from '../../../shared/route/abort.js';
import { HttpResponseBody } from './getHttpResponseBody.js';
import { type EarlyHint } from './getEarlyHints.js';
type HttpResponse = {
    statusCode: 200 | 404 | 500 | RedirectStatusCode | AbortStatusCode;
    headers: [string, string][];
    earlyHints: EarlyHint[];
    /** **Deprecated**: use `headers` instead, see https://vite-plugin-ssr.com/migration/0.4.134 */
    contentType: 'application/json' | 'text/html;charset=utf-8';
} & HttpResponseBody;
declare function createHttpResponseObject(htmlRender: null | HtmlRender, renderHook: null | RenderHook, pageContext: {
    _pageId: null | string;
    is404: null | boolean;
    errorWhileRendering: null | Error;
    __getPageAssets: GetPageAssets;
    _pageConfigs: PageConfig[];
    abortStatusCode?: AbortStatusCode;
}): Promise<HttpResponse | null>;
declare function createHttpResponsePageContextJson(pageContextSerialized: string): Promise<HttpResponse>;
declare function createHttpResponseObjectRedirect({ url, statusCode }: UrlRedirect, urlPathnameLogical: string): HttpResponse;
