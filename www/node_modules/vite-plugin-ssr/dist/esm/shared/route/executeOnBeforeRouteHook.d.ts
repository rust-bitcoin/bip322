export { executeOnBeforeRouteHook };
export type { OnBeforeRouteHook };
type OnBeforeRouteHook = {
    hookFilePath: string;
    onBeforeRoute: (pageContext: {
        urlOriginal: string;
    } & Record<string, unknown>) => unknown;
};
declare function executeOnBeforeRouteHook(onBeforeRouteHook: OnBeforeRouteHook, pageContext: {
    urlOriginal: string;
    _allPageIds: string[];
}): Promise<null | {
    urlOriginal?: string;
    _urlOriginalPristine?: string;
    _pageId?: string | null;
    routeParams?: Record<string, string>;
}>;
