export { analyzeClientSide };
import type { PageConfig } from '../page-configs/PageConfig.js';
import type { PageFile } from './getPageFileObject.js';
declare function analyzeClientSide(pageConfig: PageConfig | null, pageFilesAll: PageFile[], pageId: string): {
    isClientSideRenderable: boolean;
    isClientRouting: boolean;
};
