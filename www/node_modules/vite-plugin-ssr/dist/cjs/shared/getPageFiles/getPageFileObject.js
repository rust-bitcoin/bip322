"use strict";
// TODO/v1-release: remove
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageFileObject = void 0;
const determinePageIdOld_js_1 = require("../determinePageIdOld.js");
const assertPageFilePath_js_1 = require("../assertPageFilePath.js");
const error_page_js_1 = require("../error-page.js");
const utils_js_1 = require("../utils.js");
const fileTypes_js_1 = require("./fileTypes.js");
function getPageFileObject(filePath) {
    const isRelevant = (pageId) => pageFile.pageId === pageId ||
        (pageFile.isDefaultPageFile &&
            (isRendererFilePath(pageFile.filePath) || isAncestorDefaultPage(pageId, pageFile.filePath)));
    const fileType = (0, fileTypes_js_1.determineFileType)(filePath);
    const isEnv = (env) => {
        (0, utils_js_1.assert)(fileType !== '.page.route'); // We can't determine `.page.route.js`
        if (env === 'CLIENT_ONLY') {
            return fileType === '.page.client' || fileType === '.css';
        }
        if (env === 'SERVER_ONLY') {
            return fileType === '.page.server';
        }
        if (env === 'CLIENT_AND_SERVER') {
            return fileType === '.page';
        }
        (0, utils_js_1.assert)(false);
    };
    const pageFile = {
        filePath,
        fileType,
        isEnv,
        isRelevant,
        isDefaultPageFile: isDefaultFilePath(filePath),
        isRendererPageFile: fileType !== '.css' && isDefaultFilePath(filePath) && isRendererFilePath(filePath),
        isErrorPageFile: (0, error_page_js_1.isErrorPageId)(filePath, false),
        pageId: (0, determinePageIdOld_js_1.determinePageIdOld)(filePath)
    };
    return pageFile;
}
exports.getPageFileObject = getPageFileObject;
function isDefaultFilePath(filePath) {
    (0, assertPageFilePath_js_1.assertPageFilePath)(filePath);
    if ((0, error_page_js_1.isErrorPageId)(filePath, false)) {
        return false;
    }
    return filePath.includes('/_default');
}
function isRendererFilePath(filePath) {
    (0, assertPageFilePath_js_1.assertPageFilePath)(filePath);
    return filePath.includes('/renderer/');
}
function isAncestorDefaultPage(pageId, defaultPageFilePath) {
    (0, assertPageFilePath_js_1.assertPageFilePath)(pageId);
    (0, assertPageFilePath_js_1.assertPageFilePath)(defaultPageFilePath);
    (0, utils_js_1.assert)(!pageId.endsWith('/'));
    (0, utils_js_1.assert)(!defaultPageFilePath.endsWith('/'));
    (0, utils_js_1.assert)(isDefaultFilePath(defaultPageFilePath));
    const defaultPageDir = (0, utils_js_1.slice)(defaultPageFilePath.split('/'), 0, -1)
        .filter((filePathSegment) => filePathSegment !== '_default')
        .join('/');
    return pageId.startsWith(defaultPageDir);
}
