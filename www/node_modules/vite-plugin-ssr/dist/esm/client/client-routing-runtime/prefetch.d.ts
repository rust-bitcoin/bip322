export { prefetch };
export { addLinkPrefetchHandlers };
/**
 * Programmatically prefetch client assets.
 *
 * https://vite-plugin-ssr.com/prefetch
 *
 * @param url - The URL of the page you want to prefetch.
 */
declare function prefetch(url: string): Promise<void>;
declare function addLinkPrefetchHandlers(pageContext: {
    exports: Record<string, unknown>;
    _isProduction: boolean;
    urlPathname: string;
}): void;
