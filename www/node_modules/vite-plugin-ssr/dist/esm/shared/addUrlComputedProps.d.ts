export { addUrlComputedProps };
export { assertPageContextUrlComputedProps };
export type { PageContextUrlComputedPropsInternal };
export type { PageContextUrlComputedPropsClient };
export type { PageContextUrlComputedPropsServer };
export type { PageContextUrlSources };
type UrlParsed = {
    /** The URL origin, e.g. `https://example.com` of `https://example.com/product/42?details=yes#reviews` */
    origin: null | string;
    /** The URL pathname, e.g. `/product/42` of `https://example.com/product/42?details=yes#reviews` */
    pathname: string;
    /** URL pathname including the Base URL, e.g. `/some-base-url/product/42` of `https://example.com/some-base-url/product/42` (whereas `pageContext.urlParsed.pathname` is `/product/42`) */
    pathnameOriginal: string;
    /** The URL search parameters, e.g. `{ details: 'yes' }` for `https://example.com/product/42?details=yes#reviews` */
    search: Record<string, string>;
    /** The URL search parameters array, e.g. `{ fruit: ['apple', 'orange'] }` for `https://example.com?fruit=apple&fruit=orange` **/
    searchAll: Record<string, string[]>;
    /** The URL search parameterer string, e.g. `?details=yes` of `https://example.com/product/42?details=yes#reviews` */
    searchOriginal: null | string;
    /** @deprecated */
    searchString: null | string;
    /** The URL hash, e.g. `reviews` of `https://example.com/product/42?details=yes#reviews` */
    hash: string;
    /** The URL hash string, e.g. `#reviews` of `https://example.com/product/42?details=yes#reviews` */
    hashOriginal: null | string;
    /** @deprecated */
    hashString: null | string;
};
type PageContextUrlComputedPropsClient = {
    /** @deprecated */
    url: string;
    /** The URL of the HTTP request */
    urlOriginal: string;
    /** The URL pathname, e.g. `/product/42` of `https://example.com/product/42?details=yes#reviews` */
    urlPathname: string;
    /** Parsed information about the current URL */
    urlParsed: UrlParsed;
};
type PageContextUrlComputedPropsInternal = PageContextUrlComputedPropsClient & {
    _urlRewrite: string | null;
};
type HashProps = 'hash' | 'hashString' | 'hashOriginal';
type PageContextUrlComputedPropsServer = PageContextUrlComputedPropsClient & {
    urlParsed: Omit<PageContextUrlComputedPropsClient['urlParsed'], HashProps> & {
        /** Only available on the client-side */
        hash: '';
        /** Only available on the client-side */
        hashString: null;
        /** @deprecated */
        hashOriginal: null;
    };
};
declare function addUrlComputedProps<PageContext extends Record<string, unknown> & PageContextUrlSources>(pageContext: PageContext, enumerable?: boolean): asserts pageContext is PageContext & PageContextUrlComputedPropsInternal;
type PageContextUrlSources = {
    urlOriginal: string;
    _urlRewrite: string | null;
    _baseServer: string;
    _urlHandler: null | ((url: string) => string);
};
declare function assertPageContextUrlComputedProps(pageContext: {
    urlOriginal: string;
} & PageContextUrlComputedPropsClient): void;
