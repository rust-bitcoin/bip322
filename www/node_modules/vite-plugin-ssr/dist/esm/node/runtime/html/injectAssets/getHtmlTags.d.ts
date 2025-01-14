export { getHtmlTags };
export type { HtmlTag };
export type { PreloadFilter };
export type { InjectFilterEntry };
import type { PageContextInjectAssets } from '../injectAssets.js';
import type { InjectToStream } from '../stream/react-streaming.js';
import type { PageAsset } from '../../renderPage/getPageAssets.js';
type PreloadFilter = null | ((assets: InjectFilterEntry[]) => InjectFilterEntry[]);
type PreloadFilterInject = false | 'HTML_BEGIN' | 'HTML_END';
/** Filter what assets vite-plugin-ssr injects in the HTML.
 *
 * https://vite-plugin-ssr.com/injectFilter
 */
type InjectFilterEntry = {
    src: string;
    assetType: null | PageAsset['assetType'];
    mediaType: null | PageAsset['mediaType'];
    isEntry: boolean;
    inject: PreloadFilterInject;
};
type HtmlTag = {
    htmlTag: string | (() => string);
    position: 'HTML_BEGIN' | 'HTML_END' | 'STREAM';
};
declare function getHtmlTags(pageContext: {
    _isStream: boolean;
} & PageContextInjectAssets, injectToStream: null | InjectToStream, injectFilter: PreloadFilter): Promise<HtmlTag[]>;
