export { loadImportBuild };
export { setImportBuildGetters };
type BuildGetters = null | {
    pageFiles: () => Promise<Record<string, unknown>>;
    clientManifest: () => Promise<Record<string, unknown>>;
    pluginManifest: () => Promise<Record<string, unknown>>;
};
declare function setImportBuildGetters(getters: BuildGetters): void;
declare function loadImportBuild(outDir?: string): Promise<{
    pageFiles: Record<string, unknown>;
    clientManifest: Record<string, unknown>;
    pluginManifest: Record<string, unknown>;
}>;
declare global {
    var __vite_plugin_ssr__buildGetters: undefined | {
        getters: BuildGetters;
    };
}
