export { log404 };
export { getPagesAndRoutesInfo };
import type { PageRoutes } from '../../../../shared/route/index.js';
declare function log404(pageContext: {
    urlPathname: string;
    errorWhileRendering: null | Error;
    isClientSideNavigation: boolean;
    _pageRoutes: PageRoutes;
}): Promise<void>;
declare function getPagesAndRoutesInfo(pageRoutes: PageRoutes): string;
