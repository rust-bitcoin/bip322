"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadServerBuild = void 0;
const utils_1 = require("./utils");
const importBuildFileName_1 = require("../shared/importBuildFileName");
const import_1 = require("@brillout/import");
const debugLogs_1 = require("../shared/debugLogs");
async function loadServerBuild(outDir) {
    const autoImporter = require('../autoImporter');
    (0, debugLogs_1.debugLogsRuntimePre)(autoImporter);
    (0, utils_1.assertUsage)(autoImporter.status !== 'DISABLED', "As a library author, if you disable the auto importer, then make sure your library injects a manual import of the file dist/server/importBuild.cjs into the built server entry file dist/server/index.js (or wherever the built server entry file is located) and make sure your library doesn't call loadServerBuild(), see https://github.com/brillout/vite-plugin-import-build#manual-import and https://github.com/brillout/vite-plugin-import-build#what-it-does");
    let success = false;
    let requireError;
    let isOutsideOfCwd = null;
    if (autoImporter.status === 'SET') {
        try {
            autoImporter.loadImportBuild();
            success = true;
        }
        catch (err) {
            requireError = err;
        }
        isOutsideOfCwd = isImportBuildOutsideOfCwd(autoImporter.paths);
        if (isOutsideOfCwd) {
            success = false;
        }
    }
    else {
        // Maybe this assertion is too strict? Is it prone to race conditions?
        (0, utils_1.assert)(autoImporter.status !== 'RESET');
        (0, utils_1.assert)(
        // Yarn PnP
        autoImporter.status === 'UNSET' ||
            // User set config.vitePluginImportBuild._testCrawler
            autoImporter.status === 'TEST_CRAWLER');
    }
    if (!success) {
        success = await crawlImportBuildFileWithNodeJs(outDir);
    }
    // We don't handle the following case:
    //  - When the user directly imports importBuild.cjs, because we assume that vite-plugin-ssr and Telefunc don't call loadServerBuild() in that case
    (0, debugLogs_1.debugLogsRuntimePost)({ success, requireError, isOutsideOfCwd, outDir });
    (0, utils_1.assertUsage)(success, 'Cannot find server build. (Re-)build your app and try again. If you still get this error, then you may need to manually import the server build, see https://github.com/brillout/vite-plugin-import-build#manual-import');
}
exports.loadServerBuild = loadServerBuild;
// `${build.outDir}/dist/importBuild.cjs` may not belong to process.cwd() if e.g. vite-plugin-ssr is linked => autoImporter.js can potentially be shared between multiple projects
function isImportBuildOutsideOfCwd(paths) {
    const cwd = (0, utils_1.getCwd)();
    // We cannot check edge environments. Upon edge deployment the server code is usually bundled right after `$ vite build`, so it's unlikley that the resolved importBuildFilePath doesn't belong to cwd
    if (!cwd)
        return null;
    let importBuildFilePath;
    try {
        importBuildFilePath = paths.importBuildFilePathResolved();
    }
    catch (_a) {
        // Edge environments usually(/always?) don't support require.resolve()
        //  - This code block is called for edge environments that return a dummy process.cwd(), e.g. Cloudflare Workers: process.cwd() === '/'
        return null;
    }
    if (isWebpackResolve(importBuildFilePath))
        return null;
    importBuildFilePath = (0, utils_1.toPosixPath)(importBuildFilePath);
    (0, utils_1.assertPosixPath)(cwd);
    return !importBuildFilePath.startsWith(cwd);
}
async function crawlImportBuildFileWithNodeJs(outDir) {
    const cwd = (0, utils_1.getCwd)();
    if (!cwd)
        return false;
    let path;
    let fs;
    try {
        path = await (0, import_1.import_)('path');
        fs = await (0, import_1.import_)('fs');
    }
    catch (_a) {
        return false;
    }
    const isPathAbsolute = (p) => {
        if (process.platform === 'win32') {
            return path.win32.isAbsolute(p);
        }
        else {
            return p.startsWith('/');
        }
    };
    let distImporterPathUnresolved;
    if (outDir) {
        // Only pre-rendering has access to config.build.outDir
        (0, utils_1.assertPosixPath)(outDir);
        (0, utils_1.assert)(isPathAbsolute(outDir), outDir);
        distImporterPathUnresolved = path.posix.join(outDir, 'server', importBuildFileName_1.importBuildFileName);
    }
    else {
        // The SSR server doesn't have access to config.build.outDir so we shoot in the dark by trying with 'dist/'
        distImporterPathUnresolved = path.posix.join(cwd, 'dist', 'server', importBuildFileName_1.importBuildFileName);
    }
    const distImporterDir = path.posix.dirname(distImporterPathUnresolved);
    let distImporterPath;
    let filename;
    try {
        filename = __filename;
    }
    catch (_b) {
        // __filename isn't defined when this file is being bundled into an ESM bundle
        return false;
    }
    try {
        distImporterPath = await (0, utils_1.requireResolve)(distImporterPathUnresolved, filename);
    }
    catch (err) {
        if (fs.existsSync(distImporterDir)) {
            console.error(err);
            (0, utils_1.assert)(false, { distImporterDir, distImporterPathUnresolved });
        }
        return false;
    }
    // webpack couldn't have properly resolved distImporterPath (since there is not static import statement)
    if (isWebpackResolve(distImporterPath)) {
        return false;
    }
    // Ensure ESM compability
    (0, utils_1.assert)(distImporterPath.endsWith('.cjs'));
    await (0, import_1.import_)(distImporterPath);
    return true;
}
function isWebpackResolve(moduleResolve) {
    return typeof moduleResolve === 'number';
}
