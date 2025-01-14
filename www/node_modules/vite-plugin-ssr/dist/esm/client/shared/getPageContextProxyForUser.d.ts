export { getPageContextProxyForUser };
export { PageContextForPassToClientWarning };
type PageContextForPassToClientWarning = {
    _hasPageContextFromServer: boolean;
    _hasPageContextFromClient: boolean;
};
/**
 * - Throw error when pageContext value isn't serializable
 * - Throw error when pageContext prop is missing in passToClient
 */
declare function getPageContextProxyForUser<PageContext extends Record<string, unknown> & PageContextForPassToClientWarning>(pageContext: PageContext): PageContext;
