export { debugPageFiles };
export type { PageContextDebug };
import { RouteMatches } from '../../../shared/route/index.js';
import type { ClientDependency } from '../../../shared/getPageFiles/analyzePageClientSide/ClientDependency.js';
import type { PageFile } from '../../../shared/getPageFiles.js';
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
type PageContextDebug = {
    _routeMatches: 'ROUTE_ERROR' | RouteMatches;
};
declare function debugPageFiles({ pageContext, isHtmlOnly, isClientRouting, pageFilesLoaded, pageFilesServerSide, pageFilesClientSide, clientEntries, clientDependencies }: {
    pageContext: {
        urlOriginal: string;
        _pageId: string;
        _pageFilesAll: PageFile[];
        _pageConfigs: PageConfig[];
    } & PageContextDebug;
    isHtmlOnly: boolean;
    isClientRouting: boolean;
    pageFilesLoaded: PageFile[];
    pageFilesClientSide: PageFile[];
    pageFilesServerSide: PageFile[];
    clientEntries: string[];
    clientDependencies: ClientDependency[];
}): void;
