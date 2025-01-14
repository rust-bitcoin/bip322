export { loadImportBuild };
export { setImportBuildGetters };
import { loadServerBuild } from '@brillout/vite-plugin-import-build/loadServerBuild.js';
import { assert, autoRetry } from '../utils.js';
const buildGetters = (globalThis.__vite_plugin_ssr__buildGetters = globalThis.__vite_plugin_ssr__buildGetters || {
    getters: null
});
function setImportBuildGetters(getters) {
    buildGetters.getters = getters;
}
async function loadImportBuild(outDir) {
    if (!buildGetters.getters) {
        await loadServerBuild(outDir);
        // Await dist/server/importBuild.cjs
        await autoRetry(() => {
            assert(buildGetters.getters);
        }, 2000);
        assert(buildGetters.getters);
    }
    const [pageFiles, clientManifest, pluginManifest] = await Promise.all([
        buildGetters.getters.pageFiles(),
        buildGetters.getters.clientManifest(),
        buildGetters.getters.pluginManifest()
    ]);
    const buildEntries = { pageFiles, clientManifest, pluginManifest };
    return buildEntries;
}
