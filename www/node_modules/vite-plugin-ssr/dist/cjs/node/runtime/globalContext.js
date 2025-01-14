"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuntimeManifest = exports.setGlobalContext_viteConfig = exports.setGlobalContext_vitePreviewServer = exports.setGlobalContext_viteDevServer = exports.getViteConfig = exports.getViteDevServer = exports.getGlobalContext = exports.initGlobalContext = void 0;
const utils_js_1 = require("./utils.js");
const loadImportBuild_js_1 = require("./globalContext/loadImportBuild.js");
const getPageFiles_js_1 = require("../../shared/getPageFiles.js");
const assertPluginManifest_js_1 = require("../shared/assertPluginManifest.js");
const getConfigVps_js_1 = require("../shared/getConfigVps.js");
const assertRuntimeManifest_js_1 = require("../shared/assertRuntimeManifest.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const globalObject = (0, utils_js_1.getGlobalObject)('globalContext.ts', {});
function getGlobalContext() {
    (0, utils_js_1.assert)(globalObject.globalContext);
    return globalObject.globalContext;
}
exports.getGlobalContext = getGlobalContext;
function setGlobalContext_viteDevServer(viteDevServer) {
    if (globalObject.viteDevServer)
        return;
    (0, utils_js_1.assert)(!globalObject.globalContext);
    globalObject.viteDevServer = viteDevServer;
}
exports.setGlobalContext_viteDevServer = setGlobalContext_viteDevServer;
function setGlobalContext_vitePreviewServer(vitePreviewServer) {
    if (globalObject.vitePreviewServer)
        return;
    (0, utils_js_1.assert)(!globalObject.globalContext);
    globalObject.vitePreviewServer = vitePreviewServer;
}
exports.setGlobalContext_vitePreviewServer = setGlobalContext_vitePreviewServer;
function getViteDevServer() {
    return globalObject.viteDevServer ?? null;
}
exports.getViteDevServer = getViteDevServer;
function setGlobalContext_viteConfig(viteConfig) {
    if (globalObject.viteConfig)
        return;
    (0, utils_js_1.assert)(!globalObject.globalContext);
    globalObject.viteConfig = viteConfig;
}
exports.setGlobalContext_viteConfig = setGlobalContext_viteConfig;
function getViteConfig() {
    return globalObject.viteConfig ?? null;
}
exports.getViteConfig = getViteConfig;
async function initGlobalContext(isPrerendering = false, outDir) {
    if (globalObject.globalContext)
        return;
    const { viteDevServer, vitePreviewServer, viteConfig } = globalObject;
    assertNodeEnv(!!viteDevServer);
    const isProduction = !viteDevServer;
    if (!isProduction) {
        (0, utils_js_1.assert)(viteConfig);
        (0, utils_js_1.assert)(!isPrerendering);
        (0, utils_js_1.assert)(!vitePreviewServer);
        const configVps = await (0, getConfigVps_js_1.getConfigVps)(viteConfig);
        const pluginManifest = getRuntimeManifest(configVps);
        globalObject.globalContext = {
            isProduction: false,
            isPrerendering: false,
            clientManifest: null,
            pluginManifest: null,
            viteDevServer,
            vitePreviewServer: null,
            viteConfig,
            configVps,
            baseServer: pluginManifest.baseServer,
            baseAssets: pluginManifest.baseAssets,
            includeAssetsImportedByServer: pluginManifest.includeAssetsImportedByServer,
            redirects: pluginManifest.redirects,
            trailingSlash: pluginManifest.trailingSlash,
            disableUrlNormalization: pluginManifest.disableUrlNormalization
        };
    }
    else {
        const buildEntries = await (0, loadImportBuild_js_1.loadImportBuild)(outDir);
        assertBuildEntries(buildEntries, isPrerendering ?? false);
        const { pageFiles, clientManifest, pluginManifest } = buildEntries;
        (0, getPageFiles_js_1.setPageFiles)(pageFiles);
        assertViteManifest(clientManifest);
        (0, assertPluginManifest_js_1.assertPluginManifest)(pluginManifest);
        const globalContext = {
            isProduction: true,
            clientManifest,
            pluginManifest,
            viteDevServer: null,
            vitePreviewServer: vitePreviewServer ?? null,
            baseServer: pluginManifest.baseServer,
            baseAssets: pluginManifest.baseAssets,
            includeAssetsImportedByServer: pluginManifest.includeAssetsImportedByServer,
            redirects: pluginManifest.redirects,
            trailingSlash: pluginManifest.trailingSlash,
            disableUrlNormalization: pluginManifest.disableUrlNormalization
        };
        if (isPrerendering) {
            (0, utils_js_1.assert)(viteConfig);
            const configVps = await (0, getConfigVps_js_1.getConfigVps)(viteConfig);
            (0, utils_js_1.assert)(configVps);
            (0, utils_js_1.objectAssign)(globalContext, {
                isPrerendering: true,
                viteConfig,
                configVps
            });
            globalObject.globalContext = globalContext;
        }
        else {
            (0, utils_js_1.objectAssign)(globalContext, {
                isPrerendering: false,
                viteConfig: null,
                configVps: null
            });
            globalObject.globalContext = globalContext;
        }
    }
}
exports.initGlobalContext = initGlobalContext;
function getRuntimeManifest(configVps) {
    const { includeAssetsImportedByServer, baseServer, baseAssets, redirects, trailingSlash, disableUrlNormalization } = configVps;
    const manifest = {
        baseServer,
        baseAssets,
        includeAssetsImportedByServer,
        redirects,
        trailingSlash,
        disableUrlNormalization
    };
    (0, assertRuntimeManifest_js_1.assertRuntimeManifest)(manifest);
    return manifest;
}
exports.getRuntimeManifest = getRuntimeManifest;
function assertBuildEntries(buildEntries, isPreRendering) {
    const errMsg = [
        `You are tyring to run`,
        isPreRendering ? 'pre-rendering' : 'the server for production',
        `but your app isn't built yet. Run ${picocolors_1.default.cyan('$ vite build')} before `,
        isPreRendering ? 'pre-rendering.' : 'running the server.'
    ].join(' ');
    (0, utils_js_1.assertUsage)(buildEntries, errMsg);
}
function assertViteManifest(manifest) {
    (0, utils_js_1.assert)((0, utils_js_1.isPlainObject)(manifest));
    /* We should include these assertions but we don't as a workaround for PWA manifests: https://github.com/brillout/vite-plugin-ssr/issues/769
       Instead, we should rename the vite manifest e.g. with https://vitejs.dev/config/build-options.html#build-manifest
    Object.entries(manifest)
      // circumvent esbuild bug: esbuild adds a `default` key to JSON upon `require('./some.json')`.
      .filter(([key]) => key !== 'default')
      .forEach(([_, entry]) => {
        assert(isPlainObject(entry))
        assert(typeof entry.file === 'string')
      })
    */
}
function assertNodeEnv(hasViteDevServer) {
    const nodeEnv = (0, utils_js_1.getNodeEnv)();
    if (nodeEnv === null || nodeEnv === 'test')
        return;
    const isDevNodeEnv = [undefined, '', 'dev', 'development'].includes(nodeEnv);
    // calling Vite's createServer() is enough for hasViteDevServer to be true, even without actually adding Vite's development middleware to the server: https://github.com/brillout/vite-plugin-ssr/issues/792#issuecomment-1516830759
    (0, utils_js_1.assertWarning)(hasViteDevServer === isDevNodeEnv, `Vite's development server was${hasViteDevServer ? '' : "n't"} instantiated while the environment is set to be a ${isDevNodeEnv ? 'development' : 'production'} environment by ${picocolors_1.default.cyan(`process.env.NODE_ENV === ${JSON.stringify(nodeEnv)}`)} which is contradictory, see https://vite-plugin-ssr.com/NODE_ENV`, { onlyOnce: true });
}
