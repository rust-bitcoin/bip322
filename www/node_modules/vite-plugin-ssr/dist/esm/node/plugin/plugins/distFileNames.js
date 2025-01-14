export { distFileNames };
// Attempt to preserve file structure of `.page.js` files:
//  - https://github.com/brillout/vite-plugin-ssr/commit/11a4c49e5403aa7c37c8020c462b499425b41854
//  - Blocker: https://github.com/rollup/rollup/issues/4724
import { assertPosixPath, assert, assertUsage } from '../utils.js';
import path from 'path';
function distFileNames() {
    return {
        name: 'vite-plugin-ssr:distFileNames',
        apply: 'build',
        enforce: 'post',
        configResolved(config) {
            const rollupOutputs = getRollupOutputs(config);
            // We need to support multiple outputs: @vite/plugin-legacy adds an ouput, see https://github.com/brillout/vite-plugin-ssr/issues/477#issuecomment-1406434802
            rollupOutputs.forEach((rollupOutput) => {
                if (!rollupOutput.entryFileNames) {
                    rollupOutput.entryFileNames = (chunkInfo) => getEntryFileName(chunkInfo, config, true);
                }
                if (!rollupOutput.chunkFileNames) {
                    rollupOutput.chunkFileNames = (chunkInfo) => getChunkFileName(chunkInfo, config);
                }
                if (!rollupOutput.assetFileNames) {
                    rollupOutput.assetFileNames = (chunkInfo) => getAssetFileName(chunkInfo, config);
                }
            });
        }
    };
}
function getAssetFileName(assetInfo, config) {
    const assetsDir = getAssetsDir(config);
    const dir = assetsDir + '/static';
    let { name } = assetInfo;
    if (!name) {
        return `${dir}/[name].[hash][extname]`;
    }
    // https://github.com/brillout/vite-plugin-ssr/issues/794
    assertPosixPath(name);
    name = path.posix.basename(name);
    // dist/client/assets/index.page.server.jsx_extractAssets_lang.e4e33422.css
    // => dist/client/assets/index.page.server.e4e33422.css
    if (
    // Vite 2
    name?.endsWith('_extractAssets_lang.css') ||
        // Vite 3
        name?.endsWith('?extractAssets&lang.css')) {
        name = name.split('.').slice(0, -2).join('.');
        name = clean(name);
        return `${dir}/${name}.[hash][extname]`;
    }
    name = name.split('.').slice(0, -1).join('.');
    name = clean(name);
    return `${dir}/${name}.[hash][extname]`;
}
function getChunkFileName(_chunkInfo, config) {
    const isForClientSide = !config.build.ssr;
    let name = 'chunks/chunk-[hash].js';
    if (isForClientSide) {
        const assetsDir = getAssetsDir(config);
        name = `${assetsDir}/${name}`;
    }
    return name;
}
function getEntryFileName(chunkInfo, config, isEntry) {
    const assetsDir = getAssetsDir(config);
    const isForClientSide = !config.build.ssr;
    let { name } = chunkInfo;
    assertPosixPath(name);
    name = clean(name, true, 
    // Not needed for client-side because dist/ filenames contain `.[hash].js`
    !isForClientSide);
    if (isForClientSide) {
        return `${assetsDir}/${name}.[hash].js`;
    }
    else {
        return `${name}.${isEntry ? 'mjs' : 'js'}`;
    }
}
function removePathSeperators(name) {
    assertPosixPath(name);
    assert(!name.startsWith('/'));
    const entryDir = 'entries/';
    const hasEntryDir = name.startsWith(entryDir);
    if (hasEntryDir) {
        name = name.slice(entryDir.length);
        assert(!name.startsWith('/'));
    }
    name = name.split('/').join('_');
    if (hasEntryDir) {
        name = `${entryDir}${name}`;
    }
    return name;
}
function clean(name, removePathSep, fixGlob) {
    name = fixExtractAssetsQuery(name);
    if (fixGlob) {
        name = workaroundGlob(name);
    }
    name = replaceNonLatinCharaters(name);
    if (removePathSep) {
        name = removePathSeperators(name);
    }
    name = removeLeadingUnderscoreInFilename(name);
    name = removeUnderscoreDoublets(name);
    return name;
}
function fixExtractAssetsQuery(name) {
    name = name.replace(/\.[^\.]*_extractAssets_lang$/, '.extractAssets');
    return name;
}
function removeUnderscoreDoublets(name) {
    name = name.split(/__+/).join('_');
    return name;
}
function replaceNonLatinCharaters(name) {
    name = name.split('+').join('');
    name = name.replace(/[^a-zA-Z0-9\/\._]/g, '-');
    return name;
}
// Remove leading `_` from filename
//  - GitHub Pages treat URLs with filename starting with `_` differently (removing the need for workaround of creating a .jekyll file)
function removeLeadingUnderscoreInFilename(name) {
    assertPosixPath(name);
    const paths = name.split('/');
    {
        const last = paths.length - 1;
        let filename = paths[last];
        if (filename.startsWith('_')) {
            filename = filename.slice(1);
            paths[last] = filename;
            name = paths.join('/');
        }
    }
    return name;
}
// Ensure import.meta.glob() doesn't match dist/ files
function workaroundGlob(name) {
    // V1 design
    name = name.split('+').join('');
    ['client', 'server', 'route'].forEach((env) => {
        name = name.split(`.page.${env}`).join(`-page-${env}`);
    });
    name = name.split('.page.').join('-page.');
    name = name.replace(/\.page$/, '-page');
    return name;
}
function getRollupOutputs(config) {
    var _a, _b;
    // @ts-expect-error is read-only
    config.build ?? (config.build = {});
    (_a = config.build).rollupOptions ?? (_a.rollupOptions = {});
    (_b = config.build.rollupOptions).output ?? (_b.output = {});
    const { output } = config.build.rollupOptions;
    if (!Array.isArray(output)) {
        return [output];
    }
    return output;
}
function getAssetsDir(config) {
    let { assetsDir } = config.build;
    assertUsage(assetsDir, `${assetsDir} cannot be an empty string`);
    assetsDir = assetsDir.split(/\/|\\/).filter(Boolean).join('/');
    return assetsDir;
}
