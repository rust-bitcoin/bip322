export { analyzePageClientSide };
export { analyzePageClientSideInit };
export type { AnalysisResult };
import type { PageFile } from './getPageFileObject.js';
import type { ClientDependency } from './analyzePageClientSide/ClientDependency.js';
type AnalysisResult = {
    isHtmlOnly: boolean;
    isClientRouting: boolean;
    clientEntries: string[];
    clientDependencies: ClientDependency[];
    pageFilesClientSide: PageFile[];
    pageFilesServerSide: PageFile[];
};
declare function analyzePageClientSide(pageFilesAll: PageFile[], pageId: string): AnalysisResult;
declare function analyzePageClientSideInit(pageFilesAll: PageFile[], pageId: string, { sharedPageFilesAlreadyLoaded }: {
    sharedPageFilesAlreadyLoaded: boolean;
}): Promise<void>;
