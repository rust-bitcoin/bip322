"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonConfig = void 0;
const utils_js_1 = require("../utils.js");
const buildConfig_js_1 = require("./buildConfig.js");
const require_shim_1 = require("@brillout/require-shim");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const path_1 = __importDefault(require("path"));
const module_1 = require("module");
const assertResolveAlias_js_1 = require("./commonConfig/assertResolveAlias.js");
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
function commonConfig() {
    return [
        {
            name: 'vite-plugin-ssr:commonConfig-1',
            config: () => ({
                appType: 'custom',
                ssr: {
                    // Needed as long as VPS is published as CJS.
                    // TODO: can we remove this once VPS is published as ESM?
                    external: ['vite-plugin-ssr', 'vite-plugin-ssr/server']
                }
            }),
            configResolved(config) {
                (0, require_shim_1.installRequireShim_setUserRootDir)(config.root);
            }
        },
        {
            name: 'vite-plugin-ssr:commonConfig-2',
            enforce: 'post',
            configResolved: {
                order: 'post',
                handler(config) {
                    setDefaultPort(config);
                    workaroundCI(config);
                    (0, buildConfig_js_1.assertRollupInput)(config);
                    (0, assertResolveAlias_js_1.assertResolveAlias)(config);
                    assertEsm(config.root);
                }
            }
        }
    ];
}
exports.commonConfig = commonConfig;
function setDefaultPort(config) {
    var _a, _b;
    // @ts-ignore
    config.server ?? (config.server = {});
    (_a = config.server).port ?? (_a.port = 3000);
    // @ts-ignore
    config.preview ?? (config.preview = {});
    (_b = config.preview).port ?? (_b.port = 3000);
}
// Workaround GitHub Action failing to access the server
function workaroundCI(config) {
    var _a, _b;
    if (process.env.CI) {
        (_a = config.server).host ?? (_a.host = true);
        (_b = config.preview).host ?? (_b.host = true);
    }
}
function assertEsm(userViteRoot) {
    const packageJsonPath = (0, utils_js_1.findUserPackageJsonPath)(userViteRoot);
    if (!packageJsonPath)
        return;
    const packageJson = require_(packageJsonPath);
    let dir = path_1.default.dirname(packageJsonPath);
    if (dir !== '/') {
        (0, utils_js_1.assert)(!dir.endsWith('/'));
        dir = dir + '/';
    }
    (0, utils_js_1.assert)(dir.endsWith('/'));
    dir = picocolors_1.default.dim(dir);
    (0, utils_js_1.assertWarning)(packageJson.type === 'module', `We recommend setting ${dir}package.json#type to "module" (and therefore writing ESM code instead of CJS code), see https://vite-plugin-ssr.com/CJS`, { onlyOnce: true });
}
