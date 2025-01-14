export { analyzePageServerSide };
import type { PageFile } from './getPageFileObject.js';
declare function analyzePageServerSide(pageFilesAll: PageFile[], pageId: string): Promise<{
    hasOnBeforeRenderServerSideOnlyHook: boolean;
}>;
