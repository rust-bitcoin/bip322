export { getPrefetchSettings };
export type { PrefetchStaticAssets };
type PageContextPrefetch = {
    exports: Record<string, unknown>;
    _isProduction: boolean;
};
type PrefetchStaticAssets = false | 'hover' | 'viewport';
type PrefetchSettings = {
    prefetchStaticAssets: PrefetchStaticAssets;
};
declare function getPrefetchSettings(pageContext: PageContextPrefetch, linkTag: HTMLElement): PrefetchSettings;
