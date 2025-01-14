export { setPageFiles };
export { setPageFilesAsync };
export { getPageFilesAll };
import type { PageFile } from './getPageFileObject.js';
import type { PageConfig, PageConfigGlobal } from '../page-configs/PageConfig.js';
declare function setPageFiles(pageFilesExports: unknown): void;
declare function setPageFilesAsync(getPageFilesExports: () => Promise<unknown>): void;
declare function getPageFilesAll(isClientSide: boolean, isProduction?: boolean): Promise<{
    pageFilesAll: PageFile[];
    allPageIds: string[];
    pageConfigs: PageConfig[];
    pageConfigGlobal: PageConfigGlobal;
}>;
