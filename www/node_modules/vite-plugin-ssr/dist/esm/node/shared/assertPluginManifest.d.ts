export { assertPluginManifest };
export type { PluginManifest };
type PluginManifest = {
    version: string;
    baseServer: string;
    baseAssets: string | null;
    usesClientRouter: boolean;
    includeAssetsImportedByServer: boolean;
    manifestKeyMap: Record<string, string>;
    redirects: Record<string, string>;
    trailingSlash: boolean;
    disableUrlNormalization: boolean;
};
declare function assertPluginManifest(pluginManifest: unknown): asserts pluginManifest is PluginManifest;
