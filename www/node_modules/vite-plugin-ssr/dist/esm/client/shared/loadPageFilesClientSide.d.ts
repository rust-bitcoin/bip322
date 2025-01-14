import { type PageFile, type PageContextExports } from '../../shared/getPageFiles.js';
import type { PageConfig } from '../../shared/page-configs/PageConfig.js';
export { loadPageFilesClientSide };
export { isErrorFetchingStaticAssets };
declare function loadPageFilesClientSide(pageFilesAll: PageFile[], pageConfigs: PageConfig[], pageId: string): Promise<PageContextExports & {
    _pageFilesLoaded: PageFile[];
}>;
declare function isErrorFetchingStaticAssets(err: unknown): boolean;
