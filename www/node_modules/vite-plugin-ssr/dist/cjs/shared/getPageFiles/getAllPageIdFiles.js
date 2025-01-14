"use strict";
// TODO:v1-release: remove this file
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageFilesServerSide = exports.getPageFilesClientSide = void 0;
const utils_js_1 = require("../utils.js");
const assertPageFilePath_js_1 = require("../assertPageFilePath.js");
function getPageFilesClientSide(pageFilesAll, pageId) {
    return determine(pageFilesAll, pageId, true);
}
exports.getPageFilesClientSide = getPageFilesClientSide;
function getPageFilesServerSide(pageFilesAll, pageId) {
    return determine(pageFilesAll, pageId, false);
}
exports.getPageFilesServerSide = getPageFilesServerSide;
function determine(pageFilesAll, pageId, envIsClient) {
    const env = envIsClient ? 'CLIENT_ONLY' : 'SERVER_ONLY';
    const pageFilesRelevant = pageFilesAll
        .filter((p) => p.isRelevant(pageId) && p.fileType !== '.page.route')
        .sort(getPageFilesSorter(envIsClient, pageId));
    // Load the `.page.js` files specific to `pageId`
    const getPageIdFile = (iso) => {
        const files = pageFilesRelevant.filter((p) => p.pageId === pageId && p.isEnv(iso ? 'CLIENT_AND_SERVER' : env));
        (0, utils_js_1.assertUsage)(files.length <= 1, `Merge the following files into a single file: ${files.map((p) => p.filePath).join(' ')}`);
        const pageIdFile = files[0];
        (0, utils_js_1.assert)(pageIdFile === undefined || !pageIdFile.isDefaultPageFile);
        return pageIdFile;
    };
    const pageIdFileEnv = getPageIdFile(false);
    const pageIdFileIso = getPageIdFile(true);
    // A page can have only one renderer. In other words: Multiple `renderer/` overwrite each other.
    // Load only load renderer (`/renderer/_default.*`)
    const getRendererFile = (iso) => pageFilesRelevant.filter((p) => p.isRendererPageFile && p.isEnv(iso ? 'CLIENT_AND_SERVER' : env))[0];
    const rendererFileEnv = getRendererFile(false);
    const rendererFileIso = getRendererFile(true);
    // A page can load multiple `_defaut.page.*` files of the same `fileType`. In other words: non-renderer `_default.page.*` files are cumulative.
    // The exception being HTML-only pages because we pick a single page file as client entry. We handle that use case at `renderPage()`.
    const defaultFilesNonRenderer = pageFilesRelevant.filter((p) => p.isDefaultPageFile && !p.isRendererPageFile && (p.isEnv(env) || p.isEnv('CLIENT_AND_SERVER')));
    // Ordered by `pageContext.exports` precendence
    const pageFiles = [pageIdFileEnv, pageIdFileIso, ...defaultFilesNonRenderer, rendererFileEnv, rendererFileIso].filter(utils_js_1.isNotNullish);
    return pageFiles;
}
function getPageFilesSorter(envIsClient, pageId) {
    const env = envIsClient ? 'CLIENT_ONLY' : 'SERVER_ONLY';
    const e1First = -1;
    const e2First = +1;
    const noOrder = 0;
    return (e1, e2) => {
        // `.page.js` files specific to `pageId` first
        if (!e1.isDefaultPageFile && e2.isDefaultPageFile) {
            return e1First;
        }
        if (!e2.isDefaultPageFile && e1.isDefaultPageFile) {
            return e2First;
        }
        // Non-renderer `_default.page.*` before `renderer/**/_default.page.*`
        {
            const e1_isRenderer = e1.isRendererPageFile;
            const e2_isRenderer = e2.isRendererPageFile;
            if (!e1_isRenderer && e2_isRenderer) {
                return e1First;
            }
            if (!e2_isRenderer && e1_isRenderer) {
                return e2First;
            }
            (0, utils_js_1.assert)(e1_isRenderer === e2_isRenderer);
        }
        // Filesystem nearest first
        {
            const e1_distance = getPathDistance(pageId, e1.filePath);
            const e2_distance = getPathDistance(pageId, e2.filePath);
            if (e1_distance < e2_distance) {
                return e1First;
            }
            if (e2_distance < e1_distance) {
                return e2First;
            }
            (0, utils_js_1.assert)(e1_distance === e2_distance);
        }
        // `.page.server.js`/`.page.client.js` before `.page.js`
        {
            if (e1.isEnv(env) && e2.isEnv('CLIENT_AND_SERVER')) {
                return e1First;
            }
            if (e2.isEnv(env) && e1.isEnv('CLIENT_AND_SERVER')) {
                return e2First;
            }
        }
        return noOrder;
    };
}
function getPathDistance(pathA, pathB) {
    (0, assertPageFilePath_js_1.assertPageFilePath)(pathA);
    (0, assertPageFilePath_js_1.assertPageFilePath)(pathB);
    // Index of first different character
    let idx = 0;
    for (; idx < pathA.length && idx < pathB.length; idx++) {
        if (pathA[idx] !== pathB[idx])
            break;
    }
    const pathAWithoutCommon = pathA.slice(idx);
    const pathBWithoutCommon = pathB.slice(idx);
    const distanceA = pathAWithoutCommon.split('/').length;
    const distanceB = pathBWithoutCommon.split('/').length;
    const distance = distanceA + distanceB;
    return distance;
}
