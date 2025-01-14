"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extensionsAssets = void 0;
const utils_js_1 = require("../utils.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sirv_1 = __importDefault(require("sirv"));
const getConfigVps_js_1 = require("../../shared/getConfigVps.js");
const isAsset_js_1 = require("../shared/isAsset.js");
const ASSET_DIR = 'assets';
function extensionsAssets() {
    let config;
    let extensionsAssetsDir;
    return {
        name: 'vite-plugin-ssr:extensionsAssets',
        async configResolved(config_) {
            config = config_;
            const configVps = await (0, getConfigVps_js_1.getConfigVps)(config);
            extensionsAssetsDir = getExtensionsAssetsDir(config, configVps);
        },
        configureServer(server) {
            if (extensionsAssetsDir.length > 0) {
                return () => {
                    serveExtensionsAssets(server.middlewares, extensionsAssetsDir, config);
                };
            }
        },
        writeBundle() {
            if (!config.build.ssr && extensionsAssetsDir.length > 0) {
                copyExtensionsAssetsDir(config, extensionsAssetsDir);
            }
        }
    };
}
exports.extensionsAssets = extensionsAssets;
function serveExtensionsAssets(middlewares, extensionsAssetsDirs, config) {
    (0, utils_js_1.assert)(ASSET_DIR === getAsssetsDirConfig(config));
    extensionsAssetsDirs.forEach((assetsDir) => {
        const serve = (0, sirv_1.default)(assetsDir);
        middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith(`/${ASSET_DIR}/`)) {
                next();
                return;
            }
            // https://github.com/lukeed/sirv/issues/148 - [Feature Request] New option base.
            req.url = '/' + req.url.slice(`/${ASSET_DIR}/`.length);
            serve(req, res, next);
        });
    });
}
function getExtensionsAssetsDir(config, configVps) {
    const { extensions } = configVps;
    const extensionsWithAssetsDir = extensions.filter(({ assetsDir }) => assetsDir);
    if (0 === extensionsWithAssetsDir.length)
        return [];
    (0, utils_js_1.assertUsage)(ASSET_DIR === getAsssetsDirConfig(config), 'Cannot modify vite.config.js#build.assetsDir while using ' + extensionsWithAssetsDir[0].npmPackageName);
    const extensionsAssetsDir = extensionsWithAssetsDir.map(({ assetsDir }) => {
        (0, utils_js_1.assert)(assetsDir);
        (0, utils_js_1.assertPosixPath)(assetsDir);
        return assetsDir;
    });
    return extensionsAssetsDir;
}
function getAsssetsDirConfig(config) {
    let { assetsDir } = config.build;
    (0, utils_js_1.assertPosixPath)(assetsDir);
    assetsDir = assetsDir.split('/').filter(Boolean).join('/');
    return assetsDir;
}
function copyExtensionsAssetsDir(config, extensionsAssetsDirs) {
    (0, utils_js_1.assert)(ASSET_DIR === getAsssetsDirConfig(config));
    const { outDirClient } = (0, utils_js_1.getOutDirs)(config);
    (0, utils_js_1.assertPosixPath)(outDirClient);
    const outDirAssets = path_1.default.posix.join(outDirClient, ASSET_DIR);
    extensionsAssetsDirs.forEach((assetsDir) => {
        copyAssetFiles(assetsDir, outDirAssets);
    });
}
// Adapted from https://github.com/vitejs/vite/blob/e92d025cedabb477687d6a352ee8c9b7d529f623/packages/vite/src/node/utils.ts#L589-L604
function copyAssetFiles(srcDir, destDir) {
    let destDirCreated = false;
    for (const file of fs_1.default.readdirSync(srcDir)) {
        const srcFile = path_1.default.resolve(srcDir, file);
        const destFile = path_1.default.resolve(destDir, file);
        const stat = fs_1.default.statSync(srcFile);
        if (stat.isDirectory()) {
            copyAssetFiles(srcFile, destFile);
        }
        else if ((0, isAsset_js_1.isAsset)(srcFile)) {
            (0, utils_js_1.assert)(!(0, utils_js_1.isScriptFile)(srcFile));
            if (!destDirCreated) {
                fs_1.default.mkdirSync(destDir, { recursive: true });
                destDirCreated = true;
            }
            fs_1.default.copyFileSync(srcFile, destFile);
        }
    }
}
