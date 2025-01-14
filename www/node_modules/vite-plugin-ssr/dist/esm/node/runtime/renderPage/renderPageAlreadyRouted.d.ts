export { renderPageAlreadyRouted };
export { prerenderPage };
export { prerender404Page };
export { getPageContextInitEnhanced };
export { getRenderContext };
export type { RenderContext };
export type { PageContextAfterRender };
export type { PageContextInitEnhanced };
import { type PageFile } from '../../../shared/getPageFiles.js';
import { type PageContextUrlComputedPropsInternal } from '../../../shared/addUrlComputedProps.js';
import { HttpResponse } from './createHttpResponseObject.js';
import { PageContext_loadPageFilesServerSide, type PageFiles } from './loadPageFilesServerSide.js';
import type { PageConfig, PageConfigGlobal } from '../../../shared/page-configs/PageConfig.js';
import { type PageRoutes } from '../../../shared/route/loadPageRoutes.js';
import type { OnBeforeRouteHook } from '../../../shared/route/executeOnBeforeRouteHook.js';
type PageContextAfterRender = {
    httpResponse: null | HttpResponse;
    errorWhileRendering: null | Error;
};
declare function renderPageAlreadyRouted<PageContext extends {
    _pageId: string;
    _pageContextAlreadyProvidedByOnPrerenderHook?: true;
    is404: null | boolean;
    routeParams: Record<string, string>;
    errorWhileRendering: null | Error;
    _httpRequestId: number;
} & PageContextInitEnhanced & PageContextUrlComputedPropsInternal & PageContext_loadPageFilesServerSide>(pageContext: PageContext): Promise<PageContext & PageContextAfterRender>;
declare function prerenderPage(pageContext: PageContextInitEnhanced & PageFiles & {
    routeParams: Record<string, string>;
    _pageId: string;
    _urlRewrite: null;
    _httpRequestId: number | null;
    _usesClientRouter: boolean;
    _pageContextAlreadyProvidedByOnPrerenderHook?: true;
    is404: null | boolean;
}): Promise<{
    documentHtml: string;
    pageContextSerialized: null;
    pageContext: {
        _objectCreatedByVitePluginSsr: boolean;
        _baseServer: string;
        _baseAssets: string | null;
        _includeAssetsImportedByServer: boolean;
        _pageFilesAll: PageFile[];
        _pageConfigs: PageConfig[];
        _pageConfigGlobal: PageConfigGlobal;
        _allPageIds: string[];
        _pageRoutes: PageRoutes;
        _onBeforeRouteHook: OnBeforeRouteHook | null;
        _pageContextInit: {
            urlOriginal: string;
        };
        _urlRewrite: string | null;
        _urlHandler: ((url: string) => string) | null;
        isClientSideNavigation: boolean;
        urlOriginal: string;
    } & import("../../../shared/addUrlComputedProps.js").PageContextUrlComputedPropsClient & {
        _urlRewrite: string | null;
    } & {
        config: Record<string, unknown>;
        configEntries: import("../../../shared/getPageFiles/getExports.js").ConfigEntries;
        exports: Record<string, unknown>;
        exportsAll: import("../../../shared/getPageFiles/getExports.js").ExportsAll;
        pageExports: Record<string, unknown>;
        Page: unknown;
        _isHtmlOnly: boolean;
        _passToClient: string[];
        _pageFilePathsLoaded: string[];
    } & {
        __getPageAssets: () => Promise<import("./getPageAssets.js").PageAsset[]>;
    } & {
        routeParams: Record<string, string>;
        _pageId: string;
        _urlRewrite: null;
        _httpRequestId: number | null;
        _usesClientRouter: boolean;
        _pageContextAlreadyProvidedByOnPrerenderHook?: true | undefined;
        is404: null | boolean;
    } & {
        isClientSideNavigation: boolean;
        _urlHandler: null;
    };
} | {
    documentHtml: string;
    pageContextSerialized: string;
    pageContext: {
        _objectCreatedByVitePluginSsr: boolean;
        _baseServer: string;
        _baseAssets: string | null;
        _includeAssetsImportedByServer: boolean;
        _pageFilesAll: PageFile[];
        _pageConfigs: PageConfig[];
        _pageConfigGlobal: PageConfigGlobal;
        _allPageIds: string[];
        _pageRoutes: PageRoutes;
        _onBeforeRouteHook: OnBeforeRouteHook | null;
        _pageContextInit: {
            urlOriginal: string;
        };
        _urlRewrite: string | null;
        _urlHandler: ((url: string) => string) | null;
        isClientSideNavigation: boolean;
        urlOriginal: string;
    } & import("../../../shared/addUrlComputedProps.js").PageContextUrlComputedPropsClient & {
        _urlRewrite: string | null;
    } & {
        config: Record<string, unknown>;
        configEntries: import("../../../shared/getPageFiles/getExports.js").ConfigEntries;
        exports: Record<string, unknown>;
        exportsAll: import("../../../shared/getPageFiles/getExports.js").ExportsAll;
        pageExports: Record<string, unknown>;
        Page: unknown;
        _isHtmlOnly: boolean;
        _passToClient: string[];
        _pageFilePathsLoaded: string[];
    } & {
        __getPageAssets: () => Promise<import("./getPageAssets.js").PageAsset[]>;
    } & {
        routeParams: Record<string, string>;
        _pageId: string;
        _urlRewrite: null;
        _httpRequestId: number | null;
        _usesClientRouter: boolean;
        _pageContextAlreadyProvidedByOnPrerenderHook?: true | undefined;
        is404: null | boolean;
    } & {
        isClientSideNavigation: boolean;
        _urlHandler: null;
    };
}>;
declare function prerender404Page(renderContext: RenderContext, pageContextInit_: Record<string, unknown> | null): Promise<{
    documentHtml: string;
    pageContextSerialized: null;
    pageContext: {
        _objectCreatedByVitePluginSsr: boolean;
        _baseServer: string;
        _baseAssets: string | null;
        _includeAssetsImportedByServer: boolean;
        _pageFilesAll: PageFile[];
        _pageConfigs: PageConfig[];
        _pageConfigGlobal: PageConfigGlobal;
        _allPageIds: string[];
        _pageRoutes: PageRoutes;
        _onBeforeRouteHook: OnBeforeRouteHook | null;
        _pageContextInit: {
            urlOriginal: string;
        };
        _urlRewrite: string | null;
        _urlHandler: ((url: string) => string) | null;
        isClientSideNavigation: boolean;
        urlOriginal: string;
    } & import("../../../shared/addUrlComputedProps.js").PageContextUrlComputedPropsClient & {
        _urlRewrite: string | null;
    } & {
        config: Record<string, unknown>;
        configEntries: import("../../../shared/getPageFiles/getExports.js").ConfigEntries;
        exports: Record<string, unknown>;
        exportsAll: import("../../../shared/getPageFiles/getExports.js").ExportsAll;
        pageExports: Record<string, unknown>;
        Page: unknown;
        _isHtmlOnly: boolean;
        _passToClient: string[];
        _pageFilePathsLoaded: string[];
    } & {
        __getPageAssets: () => Promise<import("./getPageAssets.js").PageAsset[]>;
    } & {
        routeParams: Record<string, string>;
        _pageId: string;
        _urlRewrite: null;
        _httpRequestId: number | null;
        _usesClientRouter: boolean;
        _pageContextAlreadyProvidedByOnPrerenderHook?: true | undefined;
        is404: boolean | null;
    } & {
        isClientSideNavigation: boolean;
        _urlHandler: null;
    };
} | {
    documentHtml: string;
    pageContextSerialized: string;
    pageContext: {
        _objectCreatedByVitePluginSsr: boolean;
        _baseServer: string;
        _baseAssets: string | null;
        _includeAssetsImportedByServer: boolean;
        _pageFilesAll: PageFile[];
        _pageConfigs: PageConfig[];
        _pageConfigGlobal: PageConfigGlobal;
        _allPageIds: string[];
        _pageRoutes: PageRoutes;
        _onBeforeRouteHook: OnBeforeRouteHook | null;
        _pageContextInit: {
            urlOriginal: string;
        };
        _urlRewrite: string | null;
        _urlHandler: ((url: string) => string) | null;
        isClientSideNavigation: boolean;
        urlOriginal: string;
    } & import("../../../shared/addUrlComputedProps.js").PageContextUrlComputedPropsClient & {
        _urlRewrite: string | null;
    } & {
        config: Record<string, unknown>;
        configEntries: import("../../../shared/getPageFiles/getExports.js").ConfigEntries;
        exports: Record<string, unknown>;
        exportsAll: import("../../../shared/getPageFiles/getExports.js").ExportsAll;
        pageExports: Record<string, unknown>;
        Page: unknown;
        _isHtmlOnly: boolean;
        _passToClient: string[];
        _pageFilePathsLoaded: string[];
    } & {
        __getPageAssets: () => Promise<import("./getPageAssets.js").PageAsset[]>;
    } & {
        routeParams: Record<string, string>;
        _pageId: string;
        _urlRewrite: null;
        _httpRequestId: number | null;
        _usesClientRouter: boolean;
        _pageContextAlreadyProvidedByOnPrerenderHook?: true | undefined;
        is404: boolean | null;
    } & {
        isClientSideNavigation: boolean;
        _urlHandler: null;
    };
} | null>;
type PageContextInitEnhanced = ReturnType<typeof getPageContextInitEnhanced>;
declare function getPageContextInitEnhanced(pageContextInit: {
    urlOriginal: string;
}, renderContext: RenderContext, { urlComputedPropsNonEnumerable, ssr: { urlRewrite, urlHandler, isClientSideNavigation } }?: {
    urlComputedPropsNonEnumerable?: boolean;
    ssr?: {
        urlRewrite: null | string;
        urlHandler: null | ((url: string) => string);
        isClientSideNavigation: boolean;
    };
}): {
    _objectCreatedByVitePluginSsr: boolean;
    _baseServer: string;
    _baseAssets: string | null;
    _includeAssetsImportedByServer: boolean;
    _pageFilesAll: PageFile[];
    _pageConfigs: PageConfig[];
    _pageConfigGlobal: PageConfigGlobal;
    _allPageIds: string[];
    _pageRoutes: PageRoutes;
    _onBeforeRouteHook: OnBeforeRouteHook | null;
    _pageContextInit: {
        urlOriginal: string;
    };
    _urlRewrite: string | null;
    _urlHandler: ((url: string) => string) | null;
    isClientSideNavigation: boolean;
    urlOriginal: string;
} & import("../../../shared/addUrlComputedProps.js").PageContextUrlComputedPropsClient & {
    _urlRewrite: string | null;
};
type RenderContext = {
    pageFilesAll: PageFile[];
    pageConfigs: PageConfig[];
    pageConfigGlobal: PageConfigGlobal;
    allPageIds: string[];
    pageRoutes: PageRoutes;
    onBeforeRouteHook: OnBeforeRouteHook | null;
};
declare function getRenderContext(): Promise<RenderContext>;
