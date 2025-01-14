export { preparePageContextForUserConsumptionServerSide };
export type { PageContextForUserConsumptionServerSide };
import { PageContextUrlComputedPropsInternal } from '../../../shared/addUrlComputedProps.js';
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
import type { ConfigEntries, ExportsAll } from '../../../shared/getPageFiles/getExports.js';
import { PageContextBuiltInServerInternal } from '../../../shared/types.js';
type PageContextForUserConsumptionServerSide = PageContextBuiltInServerInternal & {
    urlOriginal: string;
    /** @deprecated */
    url: string;
    urlPathname: string;
    urlParsed: PageContextUrlComputedPropsInternal['urlParsed'];
    routeParams: Record<string, string>;
    Page: unknown;
    pageExports: Record<string, unknown>;
    config: Record<string, unknown>;
    configEntries: ConfigEntries;
    exports: Record<string, unknown>;
    exportsAll: ExportsAll;
    _pageId: string;
    _pageConfigs: PageConfig[];
    is404: null | boolean;
    isClientSideNavigation: boolean;
    pageProps?: Record<string, unknown>;
} & Record<string, unknown>;
declare function preparePageContextForUserConsumptionServerSide(pageContext: PageContextForUserConsumptionServerSide): void;
