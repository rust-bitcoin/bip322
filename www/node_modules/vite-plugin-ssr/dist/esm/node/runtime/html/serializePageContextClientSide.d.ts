export { serializePageContextClientSide };
export { serializePageContextAbort };
export type { PageContextSerialization };
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
import type { UrlRedirect } from '../../../shared/route/abort.js';
type PageContextSerialization = {
    _pageId: string;
    _passToClient: string[];
    _pageConfigs: PageConfig[];
    is404: null | boolean;
    pageProps?: Record<string, unknown>;
    _isError?: true;
    _pageContextInit: Record<string, unknown>;
};
declare function serializePageContextClientSide(pageContext: PageContextSerialization): string;
declare function serializePageContextAbort(pageContext: Record<string, unknown> & ({
    _urlRedirect: UrlRedirect;
} | {
    _urlRewrite: string;
} | {
    abortStatusCode: number;
})): string;
