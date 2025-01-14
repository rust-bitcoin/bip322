export { getPageAssets };
import { assert, prependBase, assertPosixPath, toPosixPath, isNpmPackageImport, unique, isNotNullish, pathJoin } from '../utils.js';
import { retrieveAssetsDev } from './getPageAssets/retrieveAssetsDev.js';
import { retrieveAssetsProd } from './getPageAssets/retrieveAssetsProd.js';
import { inferMediaType } from './inferMediaType.js';
import { getManifestEntry } from './getPageAssets/getManifestEntry.js';
import { sortPageAssetsForEarlyHintsHeader } from './getPageAssets/sortPageAssetsForEarlyHintsHeader.js';
import { getGlobalContext } from '../globalContext.js';
import { assertClientEntryId } from './getPageAssets/assertClientEntryId.js';
import { import_ } from '@brillout/import';
async function getPageAssets(pageContext, clientDependencies, clientEntries) {
    const globalContext = getGlobalContext();
    const isDev = !globalContext.isProduction;
    let assetUrls;
    let clientEntriesSrc;
    if (isDev) {
        const { viteDevServer, configVps } = globalContext;
        clientEntriesSrc = await Promise.all(clientEntries.map((clientEntry) => resolveClientEntriesDev(clientEntry, viteDevServer, configVps)));
        assetUrls = await retrieveAssetsDev(clientDependencies, viteDevServer);
    }
    else {
        const { pluginManifest, clientManifest } = globalContext;
        const manifestKeyMap = pluginManifest.manifestKeyMap;
        clientEntriesSrc = clientEntries.map((clientEntry) => resolveClientEntriesProd(clientEntry, clientManifest, manifestKeyMap));
        assetUrls = retrieveAssetsProd(clientDependencies, clientManifest, pageContext._includeAssetsImportedByServer, manifestKeyMap);
    }
    let pageAssets = [];
    unique([...clientEntriesSrc, ...assetUrls]).forEach((src) => {
        const { mediaType = null, assetType = null } = inferMediaType(src) || {};
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
        assert(1 === pageAssets.filter((p) => p.src === src).length);
    });
    pageAssets = pageAssets.map((pageAsset) => {
        const baseServerAssets = pageContext._baseAssets || pageContext._baseServer;
        pageAsset.src = prependBase(toPosixPath(pageAsset.src), baseServerAssets);
        return pageAsset;
    });
    sortPageAssetsForEarlyHintsHeader(pageAssets);
    return pageAssets;
}
async function resolveClientEntriesDev(clientEntry, viteDevServer, configVps) {
    assertClientEntryId(clientEntry);
    let root = viteDevServer.config.root;
    assert(root);
    root = toPosixPath(root);
    // The `?import` suffix is needed for MDX to be transpiled:
    //   - Not transpiled: `/pages/markdown.page.mdx`
    //   - Transpiled: `/pages/markdown.page.mdx?import`
    // But `?import` doesn't work with `/@fs/`:
    //   - Not transpiled: /@fs/home/runner/work/vite-plugin-ssr/vite-plugin-ssr/examples/react-full/pages/markdown.page.mdx
    //   - Not transpiled: /@fs/home/runner/work/vite-plugin-ssr/vite-plugin-ssr/examples/react-full/pages/markdown.page.mdx?import
    if (clientEntry.endsWith('?import')) {
        assert(clientEntry.startsWith('/'));
        return clientEntry;
    }
    assertPosixPath(clientEntry);
    let filePath;
    if (clientEntry.startsWith('/')) {
        // User files
        filePath = pathJoin(root, clientEntry);
    }
    else if (clientEntry.startsWith('@@vite-plugin-ssr/')) {
        // VPS client entry
        const { createRequire } = (await import_('module')).default;
        const { dirname } = (await import_('path')).default;
        const { fileURLToPath } = (await import_('url')).default;
        // @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
        const importMetaUrl = import.meta.url;
        const require_ = createRequire(importMetaUrl);
        const __dirname_ = dirname(fileURLToPath(importMetaUrl));
        // @ts-expect-error
        // Bun workaround https://github.com/brillout/vite-plugin-ssr/pull/1048
        const res = typeof Bun !== 'undefined' ? (toPath) => Bun.resolveSync(toPath, __dirname_) : require_.resolve;
        assert(clientEntry.endsWith('.js'));
        try {
            // For Vitest (which doesn't resolve vite-plugin-ssr to its dist but to its source files)
            // [RELATIVE_PATH_FROM_DIST] Current file: node_modules/vite-plugin-ssr/node/runtime/renderPage/getPageAssets.js
            filePath = toPosixPath(res(clientEntry.replace('@@vite-plugin-ssr/dist/esm/client/', '../../../client/').replace('.js', '.ts')));
        }
        catch {
            // For users
            // [RELATIVE_PATH_FROM_DIST] Current file: node_modules/vite-plugin-ssr/dist/esm/node/runtime/renderPage/getPageAssets.js
            filePath = toPosixPath(res(clientEntry.replace('@@vite-plugin-ssr/dist/esm/client/', '../../../../../dist/esm/client/')));
        }
    }
    else if (isNpmPackageImport(clientEntry)) {
        const extensionPageFile = configVps.extensions
            .map(({ pageConfigsDistFiles }) => pageConfigsDistFiles)
            .flat()
            .filter(isNotNullish)
            .find((e) => e.importPath === clientEntry);
        assert(extensionPageFile, clientEntry);
        filePath = extensionPageFile.filePath;
    }
    else {
        assert(false);
    }
    if (!filePath.startsWith('/')) {
        assert(process.platform === 'win32');
        filePath = '/' + filePath;
    }
    filePath = '/@fs' + filePath;
    assertPosixPath(filePath);
    return filePath;
}
function resolveClientEntriesProd(clientEntry, clientManifest, manifestKeyMap) {
    const { manifestEntry } = getManifestEntry(clientEntry, clientManifest, manifestKeyMap);
    assert(manifestEntry.isEntry || manifestEntry.isDynamicEntry || clientEntry.endsWith('.css'), { clientEntry });
    let { file } = manifestEntry;
    assert(!file.startsWith('/'));
    return '/' + file;
}
