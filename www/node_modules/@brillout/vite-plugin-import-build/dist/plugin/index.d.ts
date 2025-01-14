export { importBuild };
declare type PluginConfigProvidedByLibrary = {
    getImporterCode: GetImporterCode;
    libraryName: string;
    disableAutoImporter?: boolean;
};
/**
 * The Vite plugin `importBuild()` does two things:
 *  - Generates an "import build" file at `dist/server/importBuild.cjs`.
 *  - Generates an "auto importer" file at `node_modules/@brillout/vite-plugin-import-build/dist/autoImporter.js`.
 *
 * See https://github.com/brillout/vite-plugin-import-build#what-it-does for more information.
 */
declare function importBuild(pluginConfigProvidedByLibrary: PluginConfigProvidedByLibrary): Plugin_;
declare type GetImporterCode = (args: {
    findBuildEntry: (entryName: string) => string;
}) => string;
declare type Plugin_ = any;
