export { resolveRoute };
declare function resolveRoute(routeString: string, urlPathname: string): {
    match: boolean;
    routeParams: Record<string, string>;
};
