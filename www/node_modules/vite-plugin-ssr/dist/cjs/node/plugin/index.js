"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ssr = exports.plugin = void 0;
exports.default = plugin;
const utils_js_1 = require("./utils.js");
const buildConfig_js_1 = require("./plugins/buildConfig.js");
const previewConfig_js_1 = require("./plugins/previewConfig.js");
const autoFullBuild_js_1 = require("./plugins/autoFullBuild.js");
const index_js_1 = require("./plugins/devConfig/index.js");
const manifest_js_1 = require("./plugins/manifest.js");
const packageJsonFile_js_1 = require("./plugins/packageJsonFile.js");
const removeRequireHookPlugin_js_1 = require("./plugins/removeRequireHookPlugin.js");
const index_js_2 = require("./plugins/importUserCode/index.js");
const index_js_3 = require("./plugins/config/index.js");
const distFileNames_js_1 = require("./plugins/distFileNames.js");
const extractAssetsPlugin_js_1 = require("./plugins/extractAssetsPlugin.js");
const extractExportNamesPlugin_js_1 = require("./plugins/extractExportNamesPlugin.js");
const suppressRollupWarning_js_1 = require("./plugins/suppressRollupWarning.js");
const setGlobalContext_js_1 = require("./plugins/setGlobalContext.js");
const index_js_4 = require("./plugins/importBuild/index.js");
const commonConfig_js_1 = require("./plugins/commonConfig.js");
const extensionsAssets_js_1 = require("./plugins/extensionsAssets.js");
const baseUrls_js_1 = require("./plugins/baseUrls.js");
const envVars_js_1 = require("./plugins/envVars.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
(0, utils_js_1.markEnvAsVite)();
// Return as `any` to avoid Plugin type mismatches when there are multiple Vite versions installed
function plugin(vpsConfig) {
    const plugins = [
        (0, index_js_3.resolveVpsConfig)(vpsConfig),
        ...(0, commonConfig_js_1.commonConfig)(),
        (0, index_js_2.importUserCode)(),
        ...(0, index_js_1.devConfig)(),
        (0, buildConfig_js_1.buildConfig)(),
        (0, previewConfig_js_1.previewConfig)(),
        ...(0, autoFullBuild_js_1.autoFullBuild)(),
        ...(0, manifest_js_1.manifest)(),
        (0, packageJsonFile_js_1.packageJsonFile)(),
        (0, removeRequireHookPlugin_js_1.removeRequireHookPlugin)(),
        (0, distFileNames_js_1.distFileNames)(),
        ...(0, extractAssetsPlugin_js_1.extractAssetsPlugin)(),
        (0, extractExportNamesPlugin_js_1.extractExportNamesPlugin)(),
        (0, suppressRollupWarning_js_1.suppressRollupWarning)(),
        (0, setGlobalContext_js_1.setGlobalContext)(),
        ...(0, index_js_4.importBuild)(),
        (0, extensionsAssets_js_1.extensionsAssets)(),
        (0, baseUrls_js_1.baseUrls)(vpsConfig),
        (0, envVars_js_1.envVarsPlugin)()
    ];
    return plugins;
}
exports.plugin = plugin;
exports.ssr = plugin;
// Enable `const ssr = require('vite-plugin-ssr/plugin')`.
//  - This lives at the end of the file to ensure it happens after all assignments to `exports`.
//  - This is only used for the CJS build; we wrap it in a try-catch for the ESM build.
try {
    module.exports = Object.assign(exports.default, exports);
}
catch { }
// Error upon wrong usage
Object.defineProperty(plugin, 'apply', {
    enumerable: true,
    get: () => {
        (0, utils_js_1.assertUsage)(false, `Add ${picocolors_1.default.cyan('ssr()')} instead of ${picocolors_1.default.cyan('ssr')} to vite.config.js#plugins (i.e. call the function and add the return value instead of adding the function itself)`, { showStackTrace: true });
    }
});
