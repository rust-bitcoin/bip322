export { loadPageFilesServerSide };
export type { PageFiles };
export type { PageContext_loadPageFilesServerSide };
import { type PageFile } from '../../../shared/getPageFiles.js';
import { PromiseType } from '../utils.js';
import { PageContextGetPageAssets, type PageAsset } from './getPageAssets.js';
import { type PageContextDebug } from './debugPageFiles.js';
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
type PageContext_loadPageFilesServerSide = PageContextGetPageAssets & PageContextDebug & {
    urlOriginal: string;
    _pageFilesAll: PageFile[];
    _pageConfigs: PageConfig[];
};
type PageFiles = PromiseType<ReturnType<typeof loadPageFilesServerSide>>;
declare function loadPageFilesServerSide(pageContext: {
    _pageId: string;
} & PageContext_loadPageFilesServerSide): Promise<{
    config: Record<string, unknown>;
    configEntries: import("../../../shared/getPageFiles/getExports.js").ConfigEntries;
    exports: Record<string, unknown>;
    exportsAll: import("../../../shared/getPageFiles/getExports.js").ExportsAll;
    pageExports: Record<string, unknown>;
    Page: unknown;
    _isHtmlOnly: boolean;
    _passToClient: string[];
    _pageFilePathsLoaded: string[];
} & {
    __getPageAssets: () => Promise<PageAsset[]>;
}>;
