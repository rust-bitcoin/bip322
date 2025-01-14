"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifest = void 0;
const utils_js_1 = require("../utils.js");
const assertPluginManifest_js_1 = require("../../shared/assertPluginManifest.js");
const extractExportNamesPlugin_js_1 = require("./extractExportNamesPlugin.js");
const getConfigVps_js_1 = require("../../shared/getConfigVps.js");
const path_1 = __importDefault(require("path"));
const globalContext_js_1 = require("../../runtime/globalContext.js");
function manifest() {
    let configVps;
    let config;
    return [
        {
            name: 'vite-plugin-ssr:pluginManifest',
            apply: 'build',
            async configResolved(config_) {
                config = config_;
                configVps = await (0, getConfigVps_js_1.getConfigVps)(config);
            },
            generateBundle() {
                if ((0, utils_js_1.viteIsSSR)(config))
                    return;
                const runtimeManifest = (0, globalContext_js_1.getRuntimeManifest)(configVps);
                const manifest = {
                    version: utils_js_1.projectInfo.projectVersion,
                    usesClientRouter: (0, extractExportNamesPlugin_js_1.isUsingClientRouter)(),
                    manifestKeyMap: getManifestKeyMap(configVps, config),
                    ...runtimeManifest
                };
                (0, assertPluginManifest_js_1.assertPluginManifest)(manifest);
                this.emitFile({
                    fileName: `vite-plugin-ssr.json`,
                    type: 'asset',
                    source: JSON.stringify(manifest, null, 2)
                });
            }
        }
    ];
}
exports.manifest = manifest;
function getManifestKeyMap(configVps, config) {
    const manifestKeyMap = {};
    configVps.extensions
        .map(({ pageConfigsDistFiles }) => pageConfigsDistFiles)
        .flat()
        .filter(utils_js_1.isNotNullish)
        .forEach(({ importPath, filePath }) => {
        // Recreating https://github.com/vitejs/vite/blob/8158ece72b66307e7b607b98496891610ca70ea2/packages/vite/src/node/plugins/manifest.ts#L38
        const filePathRelative = path_1.default.posix.relative(config.root, (0, utils_js_1.toPosixPath)(filePath));
        (0, utils_js_1.assertPosixPath)(filePathRelative);
        (0, utils_js_1.assertPosixPath)(importPath);
        manifestKeyMap[importPath] = filePathRelative;
    });
    return manifestKeyMap;
}
