"use strict";
// Alternative: use `ssrEmitAssets: true`
//  - See https://github.com/vitejs/vite/pull/11430
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAssetsRE = exports.extractAssetsPlugin = void 0;
const utils_js_1 = require("../utils.js");
const extractAssetsQuery_js_1 = require("../../shared/extractAssetsQuery.js");
const getConfigVps_js_1 = require("../../shared/getConfigVps.js");
const isAsset_js_1 = require("../shared/isAsset.js");
const parseEsModule_js_1 = require("../shared/parseEsModule.js");
const removeSourceMap_js_1 = require("../shared/removeSourceMap.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const extractAssetsRE = /(\?|&)extractAssets(?:&|$)/;
exports.extractAssetsRE = extractAssetsRE;
const rawRE = /(\?|&)raw(?:&|$)/;
const urlRE = /(\?|&)url(?:&|$)/;
const EMPTY_MODULE_ID = 'virtual:vite-plugin-ssr:empty-module';
const debugNamespace = 'vps:extractAssets';
const debug = (0, utils_js_1.createDebugger)(debugNamespace);
const debugEnabled = (0, utils_js_1.isDebugEnabled)(debugNamespace);
function extractAssetsPlugin() {
    let config;
    let configVps;
    return [
        // This plugin removes all JavaScript from server-side only code, so that only CSS imports remains. (And also satic files imports e.g. `import logoURL from './logo.svg.js'`).
        {
            name: 'vite-plugin-ssr:extractAssets:remove-javaScript',
            // In dev, things just work. (Because Vite's module graph erroneously conflates the Vite server-side importees with the client-side importees.)
            apply: 'build',
            enforce: 'post',
            async transform(src, id, options) {
                if (!extractAssetsRE.test(id)) {
                    return;
                }
                (0, utils_js_1.assert)(configVps.includeAssetsImportedByServer);
                (0, utils_js_1.assert)(!(0, utils_js_1.viteIsSSR_options)(options));
                const importStatements = await (0, parseEsModule_js_1.getImportStatements)(src);
                const moduleNames = getImportedModules(importStatements);
                const code = moduleNames.map((moduleName) => `import '${moduleName}';`).join('\n');
                debugTransformResult(id, code, importStatements);
                return (0, removeSourceMap_js_1.removeSourceMap)(code);
            }
        },
        // This plugin appends `?extractAssets` to module IDs
        {
            name: 'vite-plugin-ssr:extractAssets:append-extractAssets-query',
            apply: 'build',
            // We ensure this plugin to be run before:
            //  - rollup's `alias` plugin; https://github.com/rollup/plugins/blob/5363f55aa1933b6c650832b08d6a54cb9ea64539/packages/alias/src/index.ts
            //  - Vite's `vite:resolve` plugin; https://github.com/vitejs/vite/blob/d649daba7682791178b711d9a3e44a6b5d00990c/packages/vite/src/node/plugins/resolve.ts#L105
            enforce: 'pre',
            async resolveId(source, importer, options) {
                if ((0, utils_js_1.viteIsSSR_options)(options)) {
                    // When building for the server, there should never be a `?extractAssets` query
                    (0, utils_js_1.assert)(!extractAssetsRE.test(source));
                    (0, utils_js_1.assert)(importer === undefined || !extractAssetsRE.test(importer));
                    return;
                }
                // If there is no `importer` then `module` is an entry.
                // We don't need to append `?extractAssets` to entries because they already have `?extractAssets` as VPS appends `?extractAssets` to entries by using `import.meta.glob('/**/*.page.server.js', { as: "extractAssets" })` (see `generateImportGlobs.ts`).
                if (!importer) {
                    return;
                }
                // We only append `?extractAssets` if the parent module has `?extractAssets`
                if (!extractAssetsRE.test(importer)) {
                    return;
                }
                (0, utils_js_1.assert)(configVps.includeAssetsImportedByServer);
                let resolution = null;
                try {
                    resolution = await this.resolve(source, importer, { skipSelf: true, ...options });
                }
                catch { }
                // Sometimes Rollup fails to resolve. If it fails to resolve, we assume the dependency to be an npm package and we skip it. (I guess Rollup should always be able to resolve local dependencies?)
                if (!resolution)
                    return emptyModule(source, importer);
                const { id: file, external } = resolution;
                // Nothing is externalized when building for the client-side
                (0, utils_js_1.assert)(external === false);
                // We include:
                //  - CSS(/LESS/SCSS/...) files
                //  - Asset files (`.svg`, `.pdf`, ...)
                //  - URL imports (e.g. `import scriptUrl from './script.js?url.js'`)
                if (utils_js_1.styleFileRE.test(file) || (0, isAsset_js_1.isAsset)(file) || urlRE.test(file)) {
                    debugOperation('INCLUDED', file, importer);
                    return resolution;
                }
                // We erase `source` if its file doesn't contain JavaScript
                if (!(0, utils_js_1.isScriptFile)(file)) {
                    return emptyModule(file, importer);
                }
                // If the dependency is a VPS extension and has `configVps.extension[number].pageConfigsSrcDir`, then include its CSS
                if (configVps.extensions
                    .filter(({ pageConfigsSrcDir }) => pageConfigsSrcDir !== null)
                    .some(({ npmPackageName }) => {
                    const check1 = source === npmPackageName ||
                        source.startsWith(npmPackageName + '/') ||
                        // Include relative imports within modules of `npmPackageName`. (This only works for dependencies: user may use import path aliases.)
                        source.startsWith('.');
                    // This doesn't work for linked dependencies
                    const check2 = file.includes('node_modules/' + npmPackageName + '/') ||
                        file.includes('node_modules\\' + npmPackageName + '\\');
                    if (check1) {
                        return true;
                    }
                    (0, utils_js_1.assert)(!check2);
                    return false;
                })) {
                    return appendExtractAssetsQuery(file, importer);
                }
                // If the import path resolves to a file in `node_modules/`, we ignore that file:
                //  - Direct CSS dependencies are included though, such as `import 'bootstrap/theme/dark.css'`. (Because the above if-branch for CSS files will add the file.)
                //  - Loading CSS from a library (living in `node_modules/`) in a non-direct way is non-standard; we can safely not support this case. (I'm not aware of any library that does this.)
                (0, utils_js_1.assertPosixPath)(file);
                if (file.includes('/node_modules/')) {
                    return emptyModule(file, importer);
                }
                // When a library is symlinked, it lives outside `root`.
                (0, utils_js_1.assertPosixPath)(config.root);
                if (!file.startsWith(config.root)) {
                    return emptyModule(file, importer);
                }
                return appendExtractAssetsQuery(file, importer);
            }
        },
        {
            name: 'vite-plugin-ssr:extractAssets-3',
            apply: 'build',
            async configResolved(config_) {
                configVps = await (0, getConfigVps_js_1.getConfigVps)(config_);
                config = config_;
            },
            load(id) {
                if (!(0, utils_js_1.isVirtualFileId)(id))
                    return undefined;
                id = (0, utils_js_1.getVirtualFileId)(id);
                if (id === EMPTY_MODULE_ID) {
                    return '// Erased by vite-plugin-ssr:extractAssets';
                }
            },
            config() {
                if (debugEnabled) {
                    return { logLevel: 'silent' };
                }
            }
        },
        {
            name: 'vite-plugin-ssr:extractAssets-4',
            configResolved(config) {
                // https://github.com/brillout/vite-plugin-ssr/issues/1060
                (0, utils_js_1.assertUsage)(!config.plugins.find((p) => p.name === 'vite-tsconfig-paths'), 'vite-tsconfig-paths not supported, remove it and use vite.config.js#resolve.alias instead');
            }
        }
    ];
}
exports.extractAssetsPlugin = extractAssetsPlugin;
function emptyModule(file, importer) {
    debugOperation('NUKED', file, importer);
    return (0, utils_js_1.resolveVirtualFileId)(EMPTY_MODULE_ID);
}
function appendExtractAssetsQuery(file, importer) {
    debugOperation('TRANSFORMED', file, importer);
    return (0, extractAssetsQuery_js_1.extractAssetsAddQuery)(file);
}
function getImportedModules(importStatements) {
    const moduleNames = importStatements
        .map(analyzeImport)
        .filter(({ moduleName, skip }) => {
        debug(`import ${skip ? 'SKIPPED' : 'INCLUDED'} : ${moduleName}`);
        return !skip;
    })
        .map(({ moduleName }) => {
        (0, utils_js_1.assert)(moduleName);
        return moduleName;
    });
    return moduleNames;
}
function analyzeImport(importStatement) {
    const { a: assertion, n } = importStatement;
    // `n` is `undefined` for dynamic imports with variable, e.g. `import(moduleName)`
    if (n === undefined)
        return { moduleName: null, skip: true };
    const moduleName = n;
    // Remove assertions such as:
    //  - `import json from './json.json' assert { type: 'json.js' }`
    //  - `import('asdf', { assert: { type: 'json' }})
    if (assertion !== -1) {
        return { moduleName, skip: true };
    }
    // Add imports such as `import logoUrl from './logo.svg?url.js'`
    if (urlRE.test(moduleName)) {
        return { moduleName, skip: false };
    }
    // Remove imports such as `import logoUrl from './logo.svg?raw.js'`
    if (rawRE.test(moduleName)) {
        return { moduleName, skip: true };
    }
    /* We should not do this because of aliased imports
    if (!moduleName.startsWith('.')) {
      return { moduleName, skip: true }
    }
    */
    // It seems like we need to manually nuke `react`; it seems that what the React runtime `@vitejs/react` injects is not picked up by our `resolveId` hook.
    if (/^react($|\/)/.test(moduleName)) {
        return { moduleName, skip: true };
    }
    return { moduleName, skip: false };
}
function debugOperation(operation, id, importer) {
    debug(`import ${operation}: ${id} (importer: ${importer})`);
}
function stringifyImportStatements(importStatements) {
    const importsStr = importStatements.map((importStatement) => {
        const { a: assertion, n } = importStatement;
        // `n` is `undefined` for dynamic imports with variable, e.g. `import(moduleName)`
        if (n === undefined)
            return 'import(...)';
        let importStr = `import '${n}'`;
        if (assertion !== -1) {
            importStr += ' assert { ... }';
        }
        return importStr;
    });
    return importsStr;
}
function debugTransformResult(id, code, importStatements) {
    const importStatementsStr = stringifyImportStatements(importStatements)
        .map((s) => picocolors_1.default.cyan(s))
        .join(', ');
    debug(`source TRANSFORMED: ${id} (CODE: ${picocolors_1.default.cyan(code.split('\n').join(' '))}, IMPORTS: ${importStatementsStr})`);
}
