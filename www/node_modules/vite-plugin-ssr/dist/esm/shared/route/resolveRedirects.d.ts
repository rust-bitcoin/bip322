export { resolveRedirects };
export { resolveRouteStringRedirect };
declare function resolveRedirects(redirects: Record<string, string>, urlPathname: string): null | string;
declare function resolveRouteStringRedirect(urlSource: string, urlTarget: string, urlPathname: string): null | string;
