export { route };
export type { PageRoutes, PageContextForRoute, RouteMatches };
import type { PageFile } from '../getPageFiles.js';
import { PageContextUrlComputedPropsInternal, PageContextUrlSources } from '../addUrlComputedProps.js';
import { type OnBeforeRouteHook } from './executeOnBeforeRouteHook.js';
import type { PageRoutes, RouteType } from './loadPageRoutes.js';
import type { PageConfig, PageConfigGlobal } from '../page-configs/PageConfig.js';
type PageContextForRoute = PageContextUrlComputedPropsInternal & {
    _pageFilesAll: PageFile[];
    _pageConfigs: PageConfig[];
    _allPageIds: string[];
    _pageConfigGlobal: PageConfigGlobal;
    _pageRoutes: PageRoutes;
    _onBeforeRouteHook: OnBeforeRouteHook | null;
} & PageContextUrlSources;
type RouteMatch = {
    pageId: string;
    routeString?: string;
    precedence?: number | null;
    routeType: RouteType;
    routeParams: Record<string, string>;
};
type RouteMatches = 'CUSTOM_ROUTE' | RouteMatch[];
declare function route(pageContext: PageContextForRoute): Promise<{
    pageContextAddendum: {
        _pageId: string | null;
        routeParams: Record<string, string>;
        _routingProvidedByOnBeforeRouteHook: boolean;
        _routeMatches: RouteMatches;
    } & Record<string, unknown>;
}>;
