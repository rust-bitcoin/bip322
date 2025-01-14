export { analyzeExports };
import type { PageFile } from '../getPageFileObject.js';
declare function analyzeExports({ pageFilesClientSide, pageFilesServerSide, pageId }: {
    pageFilesClientSide: PageFile[];
    pageFilesServerSide: PageFile[];
    pageId: string;
}): {
    isHtmlOnly: boolean;
    isClientRouting: boolean;
};
