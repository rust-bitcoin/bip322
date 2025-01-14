"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLogsBuildtime = exports.debugLogsRuntimePost = exports.debugLogsRuntimePre = void 0;
const utils_1 = require("./utils");
const DEBUG = false;
function debugLogsRuntimePre(autoImporter) {
    if (!DEBUG)
        return;
    log('DEBUG_LOGS_RUNTIME [begin]');
    try {
        log('process.platform', JSON.stringify(process.platform));
    }
    catch (_a) {
        log('process.platform', 'undefined');
    }
    // https://stackoverflow.com/questions/4224606/how-to-check-whether-a-script-is-running-under-node-js/35813135#35813135
    try {
        log('process.release', JSON.stringify(process.release));
    }
    catch (_b) {
        log('process.release', 'undefined');
    }
    // https://github.com/cloudflare/workers-sdk/issues/1481 - Feature Request: Detect whether code is being run in Cloudflare Workers (or Node.js)
    try {
        log('navigator', JSON.stringify(navigator));
    }
    catch (_c) {
        log('navigator', 'undefined');
    }
    log('cwd', (0, utils_1.getCwd)());
    log('importer.status', autoImporter.status);
    if (autoImporter.status === 'SET') {
        log('importer.paths.autoImporterFilePathOriginal', autoImporter.paths.autoImporterFilePathOriginal);
        log('importer.paths.autoImporterFileDirActual', autoImporter.paths.autoImporterFileDirActual);
        log('importer.paths.importBuildFilePathRelative', autoImporter.paths.importBuildFilePathRelative);
        log('importer.paths.importBuildFilePathOriginal', autoImporter.paths.importBuildFilePathOriginal);
        try {
            log('importer.paths.importBuildFilePathResolved()', autoImporter.paths.importBuildFilePathResolved());
        }
        catch (err) {
            log('importer.paths.importBuildFilePathResolved() error:', err);
            log('importer.paths.importBuildFilePathResolved()', 'ERRORED');
        }
    }
}
exports.debugLogsRuntimePre = debugLogsRuntimePre;
function debugLogsRuntimePost({ success, requireError, outDir, isOutsideOfCwd }) {
    if (!DEBUG)
        return;
    log('requireError', requireError);
    log('outDir', outDir);
    log('isOutsideOfCwd', isOutsideOfCwd);
    log('success', success);
    log('DEBUG_LOGS_RUNTIME [end]');
}
exports.debugLogsRuntimePost = debugLogsRuntimePost;
function debugLogsBuildtime({ disabled, paths }) {
    if (!DEBUG)
        return;
    log('DEBUG_LOGS_BUILD_TIME [begin]');
    if (disabled) {
        log('disabled: true');
    }
    else {
        Object.entries(paths).forEach(([key, val]) => {
            log(key, val);
        });
    }
    log('DEBUG_LOGS_BUILD_TIME [end]');
}
exports.debugLogsBuildtime = debugLogsBuildtime;
function log(...msgs) {
    console.log(`${utils_1.logLabel}[DEBUG]`, ...msgs);
}
