"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveAssetsProd = void 0;
const utils_js_1 = require("../../utils.js");
const getManifestEntry_js_1 = require("./getManifestEntry.js");
const extractAssetsQuery_js_1 = require("../../../shared/extractAssetsQuery.js");
function retrieveAssetsProd(clientDependencies, clientManifest, includeAssetsImportedByServer, manifestKeyMap) {
    let assetUrls = new Set();
    (0, utils_js_1.assert)(clientManifest);
    const visistedAssets = new Set();
    clientDependencies.forEach(({ id, onlyAssets, eagerlyImported }) => {
        if (eagerlyImported)
            return; // Eagerly imported assets aren't imported with import() and therefore don't create a new Rollup entry and aren't listed in the manifest file
        if (onlyAssets) {
            if (!includeAssetsImportedByServer)
                return;
            // We assume that all npm packages have already built their VPS page files.
            //  - Bundlers (Rollup, esbuild, tsup, ...) extract the CSS out of JavaScript => we can assume JavaScript to not import any CSS/assets
            if ((0, utils_js_1.isNpmPackageImport)(id))
                return;
            if (id.includes('.page.server.')) {
                id = (0, extractAssetsQuery_js_1.extractAssetsAddQuery)(id);
            }
        }
        const { manifestKey } = (0, getManifestEntry_js_1.getManifestEntry)(id, clientManifest, manifestKeyMap);
        collectAssets(manifestKey, assetUrls, visistedAssets, clientManifest, onlyAssets);
    });
    collectSingleStyle(assetUrls, clientManifest);
    return Array.from(assetUrls);
}
exports.retrieveAssetsProd = retrieveAssetsProd;
function collectAssets(manifestKey, assetUrls, visistedAssets, manifest, onlyCollectStaticAssets) {
    if (visistedAssets.has(manifestKey))
        return;
    visistedAssets.add(manifestKey);
    const manifestEntry = manifest[manifestKey];
    (0, utils_js_1.assert)(manifestEntry, { manifestKey });
    const { file } = manifestEntry;
    if (!onlyCollectStaticAssets) {
        assetUrls.add(`/${file}`);
    }
    const { imports = [], assets = [], css = [] } = manifestEntry;
    for (const manifestKey of imports) {
        const importManifestEntry = manifest[manifestKey];
        (0, utils_js_1.assert)(importManifestEntry);
        collectAssets(manifestKey, assetUrls, visistedAssets, manifest, onlyCollectStaticAssets);
    }
    for (const cssAsset of css) {
        assetUrls.add(`/${cssAsset}`);
    }
    for (const asset of assets) {
        assetUrls.add(`/${asset}`);
    }
}
// Support `config.build.cssCodeSplit: false`, https://github.com/brillout/vite-plugin-ssr/issues/644
function collectSingleStyle(assetUrls, manifest) {
    const style = manifest['style.css'];
    if (style && Object.values(manifest).filter((asset) => asset.file.endsWith('.css')).length === 1) {
        assetUrls.add(`/${style.file}`);
    }
}
