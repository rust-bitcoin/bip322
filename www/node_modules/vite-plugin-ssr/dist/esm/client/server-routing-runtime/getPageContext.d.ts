export { getPageContext };
declare function getPageContext(): Promise<{
    _pageId: string;
    _hasPageContextFromServer: true;
} & {
    isHydration: true;
    isBackwardNavigation: null;
    _hasPageContextFromClient: boolean;
} & {
    _pageFilesAll: import("../../shared/getPageFiles/getPageFileObject.js").PageFile[];
    _pageConfigs: import("../../shared/page-configs/PageConfig.js").PageConfig[];
} & import("../../shared/getPageFiles/getExports.js").PageContextExports & {
    _pageFilesLoaded: import("../../shared/getPageFiles/getPageFileObject.js").PageFile[];
}>;
