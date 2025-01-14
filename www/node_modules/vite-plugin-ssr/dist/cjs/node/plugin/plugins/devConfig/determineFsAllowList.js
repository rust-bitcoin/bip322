"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineFsAllowList = void 0;
const vite_1 = require("vite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utils_js_1 = require("../../utils.js");
const module_1 = require("module");
const path_2 = require("path");
const url_1 = require("url");
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
const __dirname_ = (0, path_2.dirname)((0, url_1.fileURLToPath)(importMetaUrl));
async function determineFsAllowList(config, configVps) {
    const fsAllow = config.server.fs.allow;
    // fsAllow should already contain searchForWorkspaceRoot()
    (0, utils_js_1.assert)(fsAllow.length >= 1);
    fsAllow.push(process.cwd());
    // searchForWorkspaceRoot() is buggy: https://github.com/brillout/vite-plugin-ssr/issues/555.
    // BUt that's not a problem since Vite automatically inserts searchForWorkspaceRoot().
    // We add it again just to be sure.
    fsAllow.push((0, vite_1.searchForWorkspaceRoot)(process.cwd()));
    // Add node_modules/vite-plugin-ssr/
    {
        // [RELATIVE_PATH_FROM_DIST] Current directory: node_modules/vite-plugin-ssr/dist/esm/node/plugin/plugins/config/
        const vitePluginSsrRoot = path_1.default.join(__dirname_, '../../../../../../');
        // Assert that `vitePluginSsrRoot` is indeed pointing to `node_modules/vite-plugin-ssr/`
        require_.resolve(`${vitePluginSsrRoot}/dist/esm/node/plugin/plugins/devConfig/index.js`);
        fsAllow.push(vitePluginSsrRoot);
    }
    // Add VPS extensions, e.g. node_modules/stem-react/
    configVps.extensions.forEach(({ npmPackageRootDir }) => {
        const npmPackageRootDirReal = fs_1.default.realpathSync(npmPackageRootDir);
        fsAllow.push(npmPackageRootDir);
        fsAllow.push(npmPackageRootDirReal);
    });
}
exports.determineFsAllowList = determineFsAllowList;
