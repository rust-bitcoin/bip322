"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageFilesAll = exports.setPageFilesAsync = exports.setPageFiles = void 0;
const utils_js_1 = require("../utils.js");
const parseGlobResults_js_1 = require("./parseGlobResults.js");
const getGlobalObject_js_1 = require("../../utils/getGlobalObject.js");
const globalObject = (0, getGlobalObject_js_1.getGlobalObject)('setPageFiles.ts', {});
// TODO:v1-design-release: rename setPageFiles() getPageFilesAll() parseGlobResult()
function setPageFiles(pageFilesExports) {
    const { pageFiles, pageConfigs, pageConfigGlobal } = (0, parseGlobResults_js_1.parseGlobResults)(pageFilesExports);
    globalObject.pageFilesAll = pageFiles;
    globalObject.pageConfigs = pageConfigs;
    globalObject.pageConfigGlobal = pageConfigGlobal;
}
exports.setPageFiles = setPageFiles;
function setPageFilesAsync(getPageFilesExports) {
    globalObject.pageFilesGetter = async () => {
        setPageFiles(await getPageFilesExports());
    };
}
exports.setPageFilesAsync = setPageFilesAsync;
async function getPageFilesAll(isClientSide, isProduction) {
    if (isClientSide) {
        (0, utils_js_1.assert)(!globalObject.pageFilesGetter);
        (0, utils_js_1.assert)(isProduction === undefined);
    }
    else {
        (0, utils_js_1.assert)(globalObject.pageFilesGetter);
        (0, utils_js_1.assert)(typeof isProduction === 'boolean');
        if (!globalObject.pageFilesAll ||
            // We reload all glob imports in dev to make auto-reload work
            !isProduction) {
            await globalObject.pageFilesGetter();
        }
    }
    const { pageFilesAll, pageConfigs, pageConfigGlobal } = globalObject;
    (0, utils_js_1.assert)(pageFilesAll && pageConfigs && pageConfigGlobal);
    const allPageIds = getAllPageIds(pageFilesAll, pageConfigs);
    return { pageFilesAll, allPageIds, pageConfigs, pageConfigGlobal };
}
exports.getPageFilesAll = getPageFilesAll;
function getAllPageIds(allPageFiles, pageConfigs) {
    const fileIds = allPageFiles.filter(({ isDefaultPageFile }) => !isDefaultPageFile).map(({ pageId }) => pageId);
    const allPageIds = (0, utils_js_1.unique)(fileIds);
    const allPageIds2 = pageConfigs.map((p) => p.pageId);
    return [...allPageIds, ...allPageIds2];
}
