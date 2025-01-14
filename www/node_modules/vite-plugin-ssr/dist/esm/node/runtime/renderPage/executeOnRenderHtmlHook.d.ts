export { executeOnRenderHtmlHook };
export type { RenderHook };
import { type HtmlRender } from '../html/renderHtml.js';
import type { PageAsset } from './getPageAssets.js';
import { type PageContextForUserConsumptionServerSide } from './preparePageContextForUserConsumptionServerSide.js';
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
import type { PageContextSerialization } from '../html/serializePageContextClientSide.js';
type GetPageAssets = () => Promise<PageAsset[]>;
type RenderHook = {
    hookFilePath: string;
    hookName: HookName;
};
type HookName = 'onRenderHtml' | 'render';
declare function executeOnRenderHtmlHook(pageContext: PageContextForUserConsumptionServerSide & PageContextSerialization & {
    _pageId: string;
    _pageConfigs: PageConfig[];
    __getPageAssets: GetPageAssets;
    _isHtmlOnly: boolean;
    _baseServer: string;
    _pageFilePathsLoaded: string[];
    _httpRequestId: number | null;
}): Promise<{
    renderHook: RenderHook;
    htmlRender: null | HtmlRender;
}>;
