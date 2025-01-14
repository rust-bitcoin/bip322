export { getPageContext };
export { getPageContextErrorPage };
export { checkIf404 };
export { isAlreadyServerSideRouted };
import type { PageContextExports, PageFile } from '../../shared/getPageFiles.js';
import type { PageContextUrlComputedPropsInternal } from '../../shared/addUrlComputedProps.js';
import { PageContextForRoute } from '../../shared/route/index.js';
import type { PageConfig } from '../../shared/page-configs/PageConfig.js';
import type { PageContextForPassToClientWarning } from '../shared/getPageContextProxyForUser.js';
type PageContextAddendum = {
    _pageId: string;
    isHydration: boolean;
    _pageFilesLoaded: PageFile[];
} & PageContextExports & PageContextForPassToClientWarning;
type PageContextPassThrough = PageContextUrlComputedPropsInternal & PageContextForRoute & {
    isBackwardNavigation: boolean | null;
};
declare function getPageContext(pageContext: {
    _isFirstRenderAttempt: boolean;
} & PageContextPassThrough): Promise<PageContextAddendum>;
declare function getPageContextErrorPage(pageContext: {
    urlOriginal: string;
    _allPageIds: string[];
    _isFirstRenderAttempt: boolean;
    _pageFilesAll: PageFile[];
    _pageConfigs: PageConfig[];
} & PageContextPassThrough): Promise<PageContextAddendum>;
declare function checkIf404(err: unknown): boolean;
declare function isAlreadyServerSideRouted(err: unknown): boolean;
