"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineOptimizeDeps = void 0;
const findPageFiles_js_1 = require("../../shared/findPageFiles.js");
const utils_js_1 = require("../../utils.js");
const getVikeConfig_js_1 = require("../importUserCode/v1-design/getVikeConfig.js");
const getConfigValueSource_js_1 = require("../../shared/getConfigValueSource.js");
const buildConfig_js_1 = require("../buildConfig.js");
const virtualFileImportUserCode_js_1 = require("../../../shared/virtual-files/virtualFileImportUserCode.js");
async function determineOptimizeDeps(config, configVps, isDev) {
    const { pageConfigs } = await (0, getVikeConfig_js_1.getVikeConfig)(config.root, isDev, configVps.extensions);
    const { entries, include } = await getPageDeps(config, pageConfigs, isDev);
    {
        // This actually doesn't work: Vite's dep optimizer doesn't seem to be able to crawl virtual files.
        //  - Should we make it work? E.g. by creating a temporary file at node_modules/.vite-plugin-ssr/virtualFiles.js
        //  - Or should we remove it? And make sure getPageDeps() also works for aliased import paths
        //    - If we do, then we need to adjust include/entries (maybe by making include === entries -> will Vite complain?)
        const entriesVirtualFiles = getVirtualFiles(config, pageConfigs);
        entries.push(...entriesVirtualFiles);
    }
    include.push(...getExtensionsDeps(configVps));
    /* Other Vite plugins may populate optimizeDeps, e.g. Cypress: https://github.com/brillout/vite-plugin-ssr/issues/386
    assert(config.optimizeDeps.entries === undefined)
    */
    config.optimizeDeps.include = [...include, ...normalizeInclude(config.optimizeDeps.include)];
    config.optimizeDeps.entries = [...entries, ...normalizeEntries(config.optimizeDeps.entries)];
    // console.log('config.optimizeDeps', config.optimizeDeps)
}
exports.determineOptimizeDeps = determineOptimizeDeps;
async function getPageDeps(config, pageConfigs, isDev) {
    let entries = [];
    let include = [];
    // V1 design
    {
        pageConfigs.forEach((pageConfig) => {
            const configValueSourcesRelevant = (0, getConfigValueSource_js_1.getConfigValueSourcesRelevant)(pageConfig);
            configValueSourcesRelevant.forEach((configValueSource) => {
                const { valueIsImportedAtRuntime, configEnv, definedAtInfo } = configValueSource;
                if (!valueIsImportedAtRuntime)
                    return;
                const { filePath } = definedAtInfo;
                (0, utils_js_1.assert)(filePath);
                if (configEnv !== 'client-only' && configEnv !== 'server-and-client')
                    return;
                if (filePath.startsWith('/')) {
                    // Is getFilePathAbsolute() really needed? This contradicts the code below that doesn't need getFilePathAbsolute().
                    entries.push((0, utils_js_1.getFilePathAbsolute)(filePath, config));
                    return;
                }
                // getVikeConfig() resolves relative import paths
                (0, utils_js_1.assert)(!filePath.startsWith('.'));
                // We need to differentiate between npm package imports and path aliases.
                // There are path aliases that cannot be distinguished from npm package names.
                // We recommend users to use the '#' prefix convention for path aliases, see https://vite-plugin-ssr.com/path-aliases#vite and assertResolveAlias()
                if ((0, utils_js_1.isNpmPackageImport)(filePath)) {
                    // isNpmPackageImport() returns false for a path alias like #root/renderer/onRenderClient
                    (0, utils_js_1.assert)(!filePath.startsWith('#'));
                    include.push(filePath);
                }
                else {
                    /* Path aliases, e.g.:
                     * ```js
                     * // /renderer/+config.js
                     * import onRenderClient from '#root/renderer/onRenderClient'
                     * ```
                     * Does Vite resolve the path aliases or is getFilePathAbsolute() needed?
                     */
                    entries.push(filePath);
                }
            });
        });
    }
    // V0.4 design
    {
        const pageFiles = await (0, findPageFiles_js_1.findPageFiles)(config, ['.page', '.page.client'], isDev);
        pageFiles.forEach((filePath) => {
            const entry = (0, utils_js_1.getFilePathAbsolute)(filePath, config);
            entries.push(entry);
        });
    }
    entries = (0, utils_js_1.unique)(entries);
    include = (0, utils_js_1.unique)(include);
    return { entries, include };
}
function getVirtualFiles(config, pageConfigs) {
    const { hasClientRouting, hasServerRouting, clientEntries } = (0, buildConfig_js_1.analyzeClientEntries)(pageConfigs, config);
    const entriesVirtualFiles = Object.values(clientEntries);
    if (hasClientRouting)
        entriesVirtualFiles.push(virtualFileImportUserCode_js_1.virtualFileIdImportUserCodeClientCR);
    if (hasServerRouting)
        entriesVirtualFiles.push(virtualFileImportUserCode_js_1.virtualFileIdImportUserCodeClientSR);
    return entriesVirtualFiles;
}
function getExtensionsDeps(configVps) {
    return [
        /* Doesn't work since `pageConfigsSrcDir` is a directory. We could make it work by using find-glob.
        ...configVps.extensions
          .map(({ pageConfigsSrcDir }) => pageConfigsSrcDir)
          .flat()
          .filter(isNotNullish),
        //*/
        ...configVps.extensions
            .map(({ pageConfigsDistFiles }) => pageConfigsDistFiles)
            .flat()
            .filter(utils_js_1.isNotNullish)
            .filter(({ importPath }) => !importPath.endsWith('.css'))
            .map(({ importPath }) => importPath)
    ];
}
function normalizeEntries(entries) {
    if (Array.isArray(entries))
        return entries;
    if (typeof entries === 'string')
        return [entries];
    if (entries === undefined)
        return [];
    (0, utils_js_1.assert)(false);
}
function normalizeInclude(include) {
    if (Array.isArray(include))
        return include;
    if (include === undefined)
        return [];
    (0, utils_js_1.assert)(false);
}
