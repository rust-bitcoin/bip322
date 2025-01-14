export { loadPageRoutes };
export type { PageRoutes };
export type { RouteType };
import type { PageFile } from '../getPageFiles.js';
import type { OnBeforeRouteHook } from './executeOnBeforeRouteHook.js';
import type { PageConfig, PageConfigGlobal } from '../page-configs/PageConfig.js';
type PageRoute = {
    pageId: string;
    comesFromV1PageConfig: boolean;
} & ({
    routeString: string;
    routeDefinedAt: null;
    routeType: 'FILESYSTEM';
    routeFilesystemDefinedBy: string;
} | {
    routeString: string;
    routeDefinedAt: string;
    routeType: 'STRING';
} | {
    routeFunction: Function;
    routeDefinedAt: string;
    routeType: 'FUNCTION';
});
type PageRoutes = PageRoute[];
type RouteType = 'STRING' | 'FUNCTION' | 'FILESYSTEM';
declare function loadPageRoutes(pageFilesAll: PageFile[], pageConfigs: PageConfig[], pageConfigGlobal: PageConfigGlobal, allPageIds: string[]): Promise<{
    pageRoutes: PageRoutes;
    onBeforeRouteHook: null | OnBeforeRouteHook;
}>;
