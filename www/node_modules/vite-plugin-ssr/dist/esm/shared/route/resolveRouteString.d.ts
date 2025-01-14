export { resolveRouteString };
export { getUrlFromRouteString };
export { isStaticRouteString };
export { analyzeRouteString };
export { assertRouteString };
declare function assertRouteString(routeString: string, errPrefix?: `${string}Invalid` | `${string}invalid`): void;
declare function resolveRouteString(routeString: string, urlPathname: string): null | {
    routeParams: Record<string, string>;
};
declare function getUrlFromRouteString(routeString: string): null | string;
declare function analyzeRouteString(routeString: string): {
    numberOfParameterSegments: number;
    numberOfStaticSegmentsBeginning: number;
    numberOfStaticSegements: number;
    isCatchAll: boolean;
};
declare function isStaticRouteString(routeString: string): boolean;
