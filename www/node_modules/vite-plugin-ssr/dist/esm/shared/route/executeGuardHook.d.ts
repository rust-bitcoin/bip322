export { executeGuardHook };
import type { PageContextExports, PageFile } from '../getPageFiles.js';
import type { PageConfig } from '../page-configs/PageConfig.js';
declare function executeGuardHook<T extends PageContextExports & {
    _pageId: string;
    _pageFilesAll: PageFile[];
    _pageConfigs: PageConfig[];
}>(pageContext: T, prepareForUserConsumption: (pageConfig: T) => T | void): Promise<void>;
