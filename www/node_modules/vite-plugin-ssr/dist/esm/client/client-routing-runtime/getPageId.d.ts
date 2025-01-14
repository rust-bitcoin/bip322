export { getPageId };
declare function getPageId(url: string): Promise<{
    pageId: null;
    pageFilesAll: import("../../shared/getPageFiles/getPageFileObject.js").PageFile[];
    pageConfigs: import("../../shared/page-configs/PageConfig.js").PageConfig[];
} | {
    pageId: string;
    pageFilesAll: import("../../shared/getPageFiles/getPageFileObject.js").PageFile[];
    pageConfigs: import("../../shared/page-configs/PageConfig.js").PageConfig[];
}>;
