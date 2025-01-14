export { removeBuiltInOverrides };
declare const BUILT_IN_CLIENT_ROUTER: readonly ["urlPathname", "urlParsed"];
declare const BUILT_IN_CLIENT: readonly ["Page", "pageExports", "exports"];
type DeletedKeys = (typeof BUILT_IN_CLIENT)[number] | (typeof BUILT_IN_CLIENT_ROUTER)[number];
declare function removeBuiltInOverrides(pageContext: Record<string, unknown> & {
    [key in DeletedKeys]?: never;
}): void;
