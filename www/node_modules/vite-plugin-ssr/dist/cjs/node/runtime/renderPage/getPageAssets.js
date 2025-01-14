"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageAssets = void 0;
const utils_js_1 = require("../utils.js");
const retrieveAssetsDev_js_1 = require("./getPageAssets/retrieveAssetsDev.js");
const retrieveAssetsProd_js_1 = require("./getPageAssets/retrieveAssetsProd.js");
const inferMediaType_js_1 = require("./inferMediaType.js");
const getManifestEntry_js_1 = require("./getPageAssets/getManifestEntry.js");
const sortPageAssetsForEarlyHintsHeader_js_1 = require("./getPageAssets/sortPageAssetsForEarlyHintsHeader.js");
const globalContext_js_1 = require("../globalContext.js");
const assertClientEntryId_js_1 = require("./getPageAssets/assertClientEntryId.js");
const import_1 = require("@brillout/import");
async function getPageAssets(pageContext, clientDependencies, clientEntries) {
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    const isDev = !globalContext.isProduction;
    let assetUrls;
    let clientEntriesSrc;
    if (isDev) {
        const { viteDevServer, configVps } = globalContext;
        clientEntriesSrc = await Promise.all(clientEntries.map((clientEntry) => resolveClientEntriesDev(clientEntry, viteDevServer, configVps)));
        assetUrls = await (0, retrieveAssetsDev_js_1.retrieveAssetsDev)(clientDependencies, viteDevServer);
    }
    else {
        const { pluginManifest, clientManifest } = globalContext;
        const manifestKeyMap = pluginManifest.manifestKeyMap;
        clientEntriesSrc = clientEntries.map((clientEntry) => resolveClientEntriesProd(clientEntry, clientManifest, manifestKeyMap));
        assetUrls = (0, retrieveAssetsProd_js_1.retrieveAssetsProd)(clientDependencies, clientManifest, pageContext._includeAssetsImportedByServer, manifestKeyMap);
    }
    let pageAssets = [];
    (0, utils_js_1.unique)([...clientEntriesSrc, ...assetUrls]).forEach((src) => {
        const { mediaType = null, assetType = null } = (0, inferMediaType_js_1.inferMediaType)(src) || {};
        if (isDev && assetType === 'style') {
            // https://github.com/brillout/vite-plugin-ssr/issues/449
            if (src.endsWith('?inline')) {
                return;
            }
            // https://github.com/brillout/vite-plugin-ssr/issues/401
            src = src + '?direct';
        }
        const isEntry = clientEntriesSrc.includes(src) ||
            // Vite automatically injects CSS, not only in development, but also in production (albeit with a FOUC). Therefore, strictly speaking, CSS aren't entries. We still, however, set `isEntry: true` for CSS, in order to denote page assets that should absolutely be injected in the HTML, regardless of preload strategy (not injecting CSS leads to FOUC).
            assetType === 'style';
        pageAssets.push({
            src,
            assetType,
            mediaType,
            isEntry
        });
    });
    pageAssets.forEach(({ src }) => {
        (0, utils_js_1.assert)(1 === pageAssets.filter((p) => p.src === src).length);
    });
    pageAssets = pageAssets.map((pageAsset) => {
        const baseServerAssets = pageContext._baseAssets || pageContext._baseServer;
        pageAsset.src = (0, utils_js_1.prependBase)((0, utils_js_1.toPosixPath)(pageAsset.src), baseServerAssets);
        return pageAsset;
    });
    (0, sortPageAssetsForEarlyHintsHeader_js_1.sortPageAssetsForEarlyHintsHeader)(pageAssets);
    return pageAssets;
}
exports.getPageAssets = getPageAssets;
async function resolveClientEntriesDev(clientEntry, viteDevServer, configVps) {
    (0, assertClientEntryId_js_1.assertClientEntryId)(clientEntry);
    let root = viteDevServer.config.root;
    (0, utils_js_1.assert)(root);
    root = (0, utils_js_1.toPosixPath)(root);
    // The `?import` suffix is needed for MDX to be transpiled:
    //   - Not transpiled: `/pages/markdown.page.mdx`
    //   - Transpiled: `/pages/markdown.page.mdx?import`
    // But `?import` doesn't work with `/@fs/`:
    //   - Not transpiled: /@fs/home/runner/work/vite-plugin-ssr/vite-plugin-ssr/examples/react-full/pages/markdown.page.mdx
    //   - Not transpiled: /@fs/home/runner/work/vite-plugin-ssr/vite-plugin-ssr/examples/react-full/pages/markdown.page.mdx?import
    if (clientEntry.endsWith('?import')) {
        (0, utils_js_1.assert)(clientEntry.startsWith('/'));
        return clientEntry;
    }
    (0, utils_js_1.assertPosixPath)(clientEntry);
    let filePath;
    if (clientEntry.startsWith('/')) {
        // User files
        filePath = (0, utils_js_1.pathJoin)(root, clientEntry);
    }
    else if (clientEntry.startsWith('@@vite-plugin-ssr/')) {
        // VPS client entry
        const { createRequire } = (await (0, import_1.import_)('module')).default;
        const { dirname } = (await (0, import_1.import_)('path')).default;
        const { fileURLToPath } = (await (0, import_1.import_)('url')).default;
        // @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
        const importMetaUrl = `file://${__filename}`;
        const require_ = createRequire(importMetaUrl);
        const __dirname_ = dirname(fileURLToPath(importMetaUrl));
        // @ts-expect-error
        // Bun workaround https://github.com/brillout/vite-plugin-ssr/pull/1048
        const res = typeof Bun !== 'undefined' ? (toPath) => Bun.resolveSync(toPath, __dirname_) : require_.resolve;
        (0, utils_js_1.assert)(clientEntry.endsWith('.js'));
        try {
            // For Vitest (which doesn't resolve vite-plugin-ssr to its dist but to its source files)
            // [RELATIVE_PATH_FROM_DIST] Current file: node_modules/vite-plugin-ssr/node/runtime/renderPage/getPageAssets.js
            filePath = (0, utils_js_1.toPosixPath)(res(clientEntry.replace('@@vite-plugin-ssr/dist/esm/client/', '../../../client/').replace('.js', '.ts')));
        }
        catch {
            // For users
            // [RELATIVE_PATH_FROM_DIST] Current file: node_modules/vite-plugin-ssr/dist/esm/node/runtime/renderPage/getPageAssets.js
            filePath = (0, utils_js_1.toPosixPath)(res(clientEntry.replace('@@vite-plugin-ssr/dist/esm/client/', '../../../../../dist/esm/client/')));
        }
    }
    else if ((0, utils_js_1.isNpmPackageImport)(clientEntry)) {
        const extensionPageFile = configVps.extensions
            .map(({ pageConfigsDistFiles }) => pageConfigsDistFiles)
            .flat()
            .filter(utils_js_1.isNotNullish)
            .find((e) => e.importPath === clientEntry);
        (0, utils_js_1.assert)(extensionPageFile, clientEntry);
        filePath = extensionPageFile.filePath;
    }
    else {
        (0, utils_js_1.assert)(false);
    }
    if (!filePath.startsWith('/')) {
        (0, utils_js_1.assert)(process.platform === 'win32');
        filePath = '/' + filePath;
    }
    filePath = '/@fs' + filePath;
    (0, utils_js_1.assertPosixPath)(filePath);
    return filePath;
}
function resolveClientEntriesProd(clientEntry, clientManifest, manifestKeyMap) {
    const { manifestEntry } = (0, getManifestEntry_js_1.getManifestEntry)(clientEntry, clientManifest, manifestKeyMap);
    (0, utils_js_1.assert)(manifestEntry.isEntry || manifestEntry.isDynamicEntry || clientEntry.endsWith('.css'), { clientEntry });
    let { file } = manifestEntry;
    (0, utils_js_1.assert)(!file.startsWith('/'));
    return '/' + file;
}
