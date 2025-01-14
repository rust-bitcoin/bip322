export { renderPage };
export { renderPage_addWrapper };
import { HttpResponse } from './renderPage/createHttpResponseObject.js';
import type { PageContextBuiltInServer } from '../../types/index.js';
declare let renderPage_wrapper: <PageContext>(_httpRequestId: number, ret: () => Promise<PageContext>) => Promise<{
    pageContextReturn: Awaited<PageContext>;
    onRequestDone: () => void;
}>;
declare const renderPage_addWrapper: (wrapper: typeof renderPage_wrapper) => void;
declare function renderPage<PageContextUserAdded extends {}, PageContextInit extends {
    /** @deprecated */
    url?: string;
    /** The URL of the HTTP request */
    urlOriginal: string;
}>(pageContextInit: PageContextInit): Promise<PageContextInit & {
    httpResponse: HttpResponse | null;
} & Partial<PageContextBuiltInServer & PageContextUserAdded>>;
