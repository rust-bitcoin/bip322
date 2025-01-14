export { parseGlobResults };
import { type PageFile } from './getPageFileObject.js';
import type { PageConfig, PageConfigGlobal } from '../page-configs/PageConfig.js';
declare function parseGlobResults(pageFilesExports: unknown): {
    pageFiles: PageFile[];
    pageConfigs: PageConfig[];
    pageConfigGlobal: PageConfigGlobal;
};
