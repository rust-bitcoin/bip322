export { createPageContext };
declare function createPageContext<T extends {
    urlOriginal: string;
}>(pageContextBase?: T): Promise<{
    _objectCreatedByVitePluginSsr: boolean;
    _urlHandler: null;
    _urlRewrite: null;
    _baseServer: string;
    _isProduction: boolean;
    _pageFilesAll: import("../../shared/getPageFiles/getPageFileObject.js").PageFile[];
    _pageConfigs: import("../../shared/page-configs/PageConfig.js").PageConfig[];
    _pageConfigGlobal: import("../../shared/page-configs/PageConfig.js").PageConfigGlobal;
    _allPageIds: string[];
    _pageRoutes: import("../../shared/route/loadPageRoutes.js").PageRoutes;
    _onBeforeRouteHook: import("../../shared/route/executeOnBeforeRouteHook.js").OnBeforeRouteHook | null;
} & T & import("../../shared/addUrlComputedProps.js").PageContextUrlComputedPropsClient & {
    _urlRewrite: string | null;
}>;
