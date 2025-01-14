"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOutDir = exports.getOutDirs_prerender = exports.getOutDirs = void 0;
const viteIsSSR_js_1 = require("./viteIsSSR.js");
const assert_js_1 = require("./assert.js");
const path_shim_js_1 = require("./path-shim.js");
const filesystemPathHandling_js_1 = require("./filesystemPathHandling.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function getOutDirs(config) {
    const outDir = getOutDirFromResolvedConfig(config);
    assertOutDirResolved(outDir, config);
    (0, assert_js_1.assert)(outDir.endsWith('/server') || outDir.endsWith('/client'));
    (0, assert_js_1.assert)('/client'.length === '/server'.length);
    const outDirRoot = outDir.slice(0, -1 * '/client'.length);
    return getOutDirsAll(outDirRoot, config.root);
}
exports.getOutDirs = getOutDirs;
function getOutDirs_prerender(config) {
    const outDirRoot = getOutDirFromResolvedConfig(config);
    (0, assert_js_1.assert)(isOutDirRoot(outDirRoot));
    return getOutDirsAll(outDirRoot, config.root);
}
exports.getOutDirs_prerender = getOutDirs_prerender;
/** Appends `client/` or `server/` to `config.build.outDir` */
function resolveOutDir(config) {
    const outDir = getOutDirFromUserConfig(config) || 'dist';
    // outDir may already be resolved when using Telefunc + vite-plugin-ssr (because both Telefunc and vite-plugin-ssr use this logic)
    if (!isOutDirRoot(outDir)) {
        assertOutDirResolved(outDir, config);
        return outDir;
    }
    else {
        const { outDirClient, outDirServer } = determineOutDirs(outDir);
        if ((0, viteIsSSR_js_1.viteIsSSR)(config)) {
            return outDirServer;
        }
        else {
            return outDirClient;
        }
    }
}
exports.resolveOutDir = resolveOutDir;
function determineOutDirs(outDirRoot) {
    (0, filesystemPathHandling_js_1.assertPosixPath)(outDirRoot);
    (0, assert_js_1.assert)(isOutDirRoot(outDirRoot));
    const outDirClient = (0, path_shim_js_1.pathJoin)(outDirRoot, 'client');
    const outDirServer = (0, path_shim_js_1.pathJoin)(outDirRoot, 'server');
    assertIsNotOutDirRoot(outDirClient);
    assertIsNotOutDirRoot(outDirServer);
    return { outDirClient, outDirServer };
}
function getOutDirsAll(outDirRoot, root) {
    if (!outDirIsAbsolutePath(outDirRoot)) {
        (0, filesystemPathHandling_js_1.assertPosixPath)(outDirRoot);
        (0, filesystemPathHandling_js_1.assertPosixPath)(root);
        outDirRoot = (0, path_shim_js_1.pathJoin)(root, outDirRoot);
    }
    let { outDirClient, outDirServer } = determineOutDirs(outDirRoot);
    outDirRoot = outDirRoot + '/';
    outDirClient = outDirClient + '/';
    outDirServer = outDirServer + '/';
    assertNormalization(outDirRoot);
    assertNormalization(outDirClient);
    assertNormalization(outDirServer);
    return { outDirRoot, outDirClient, outDirServer };
}
function assertNormalization(outDirAny) {
    (0, filesystemPathHandling_js_1.assertPosixPath)(outDirAny);
    (0, assert_js_1.assert)(outDirIsAbsolutePath(outDirAny));
    (0, assert_js_1.assert)(outDirAny.endsWith('/'));
    (0, assert_js_1.assert)(!outDirAny.endsWith('//'));
}
function isOutDirRoot(outDirRot) {
    const p = outDirRot.split('/').filter(Boolean);
    const lastDir = p[p.length - 1];
    return lastDir !== 'client' && lastDir !== 'server';
}
function assertIsNotOutDirRoot(outDir) {
    (0, assert_js_1.assert)(outDir.endsWith('/client') || outDir.endsWith('/server'));
}
/** `outDir` ends with `/server` or `/client` */
function assertOutDirResolved(outDir, config) {
    (0, filesystemPathHandling_js_1.assertPosixPath)(outDir);
    assertIsNotOutDirRoot(outDir);
    (0, assert_js_1.assert)('/client'.length === '/server'.length);
    const outDirCorrected = outDir.slice(0, -1 * '/client'.length);
    const wrongUsage = `You've set Vite's config.build.outDir to ${picocolors_1.default.cyan(outDir)} but you should set it to ${picocolors_1.default.cyan(outDirCorrected)} instead.`;
    if ((0, viteIsSSR_js_1.viteIsSSR)(config)) {
        (0, assert_js_1.assertUsage)(outDir.endsWith('/server'), wrongUsage);
    }
    else {
        (0, assert_js_1.assertUsage)(outDir.endsWith('/client'), wrongUsage);
    }
}
function getOutDirFromUserConfig(config) {
    let outDir = config.build?.outDir;
    if (outDir === undefined)
        return undefined;
    // I believe Vite normalizes config.build.outDir only if config is ResolvedConfig
    outDir = (0, filesystemPathHandling_js_1.toPosixPath)(outDir);
    return outDir;
}
function getOutDirFromResolvedConfig(config) {
    let outDir = config.build.outDir;
    // Vite seems to be buggy and doesn't always normalize config.build.outDir
    outDir = (0, filesystemPathHandling_js_1.toPosixPath)(outDir);
    return outDir;
}
function outDirIsAbsolutePath(outDir) {
    // There doesn't seem to be a better alternative to determine whether `outDir` is an aboslute path
    //  - Very unlikely that `outDir`'s first dir macthes the filesystem's first dir
    //    - Although more likely to happen with Docker
    return getFirstDir(outDir) === getFirstDir(process.cwd());
}
function getFirstDir(p) {
    const firstDir = p.split(/\/|\\/).filter(Boolean)[0];
    return firstDir;
}
