export { injectHtmlTagsToString };
export { injectHtmlTagsToStream };
export type { PageContextInjectAssets };
export type { PageContextPromise };
import type { PageAsset } from '../renderPage/getPageAssets.js';
import type { HtmlPart } from './renderHtml.js';
import { type PreloadFilter } from './injectAssets/getHtmlTags.js';
import type { InjectToStream } from './stream/react-streaming.js';
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
import type { PageContextSerialization } from './serializePageContextClientSide.js';
type PageContextInjectAssets = {
    urlPathname: string;
    __getPageAssets: () => Promise<PageAsset[]>;
    _pageId: string;
    _isHtmlOnly: boolean;
    _pageContextPromise: PageContextPromise;
    _renderHook: {
        hookFilePath: string;
        hookName: 'onRenderHtml' | 'render';
    };
    _baseServer: string;
    _pageConfigs: PageConfig[];
    is404: null | boolean;
} & PageContextSerialization;
declare function injectHtmlTagsToString(htmlParts: HtmlPart[], pageContext: PageContextInjectAssets & {
    _isStream: false;
}, injectFilter: PreloadFilter): Promise<string>;
declare function injectHtmlTagsToStream(pageContext: PageContextInjectAssets & {
    _isStream: true;
}, injectToStream: null | InjectToStream, injectFilter: PreloadFilter): {
    injectAtStreamBegin: (htmlPartsBegin: HtmlPart[]) => Promise<string>;
    injectAtStreamEnd: (htmlPartsEnd: HtmlPart[]) => Promise<string>;
};
type PageContextPromise = null | Promise<unknown> | (() => void | Promise<unknown>);
