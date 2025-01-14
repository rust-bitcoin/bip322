"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importBuild = void 0;
const plugin_js_1 = require("@brillout/vite-plugin-import-build/plugin.js");
const utils_js_1 = require("../../utils.js");
const path_1 = __importDefault(require("path"));
const module_1 = require("module");
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
function importBuild() {
    let config;
    return [
        {
            name: 'vite-plugin-ssr:importBuild:config',
            enforce: 'post',
            configResolved(config_) {
                config = config_;
            }
        },
        (0, plugin_js_1.importBuild)({
            getImporterCode: ({ findBuildEntry }) => {
                const pageFilesEntry = findBuildEntry('pageFiles');
                return getImporterCode(config, pageFilesEntry);
            },
            libraryName: utils_js_1.projectInfo.projectName
        })
    ];
}
exports.importBuild = importBuild;
function getImporterCode(config, pageFilesEntry) {
    const importPathAbsolute = (0, utils_js_1.toPosixPath)(
    // [RELATIVE_PATH_FROM_DIST] Current file: node_modules/vite-plugin-ssr/dist/esm/node/plugin/plugins/importBuild/index.js
    require_.resolve(`../../../../../../dist/esm/node/runtime/globalContext/loadImportBuild.js`));
    const { outDirServer } = (0, utils_js_1.getOutDirs)(config);
    const importPath = path_1.default.posix.relative(outDirServer, importPathAbsolute);
    // The only reason we went for using CJS require() instead of ESM import() is because import() doesn't support .json files
    const importerCode = [
        '(async () => {',
        `  const { setImportBuildGetters } = await import('${importPath}');`,
        '  setImportBuildGetters({',
        `    pageFiles: () => import('./${pageFilesEntry}'),`,
        "    clientManifest: () => require('../assets.json'),",
        // TODO: use virtual file instead of generating vite-plugin-ssr.json
        "    pluginManifest: () => require('../client/vite-plugin-ssr.json'),",
        '  });',
        '})()',
        ''
    ].join('\n');
    return importerCode;
}
