"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePageContextRequestUrl = void 0;
const getPageContextRequestUrl_js_1 = require("../../../shared/getPageContextRequestUrl.js");
const utils_js_1 = require("../utils.js");
// See shared/getPageContextRequestUrl.ts
function handlePageContextRequestUrl(url) {
    if (!hasSuffix(url)) {
        return { urlWithoutPageContextRequestSuffix: url, isPageContextRequest: false };
    }
    return { urlWithoutPageContextRequestSuffix: removePageContextUrlSuffix(url), isPageContextRequest: true };
}
exports.handlePageContextRequestUrl = handlePageContextRequestUrl;
function hasSuffix(url) {
    const { pathnameOriginal, pathname } = (0, utils_js_1.parseUrl)(url, utils_js_1.baseServer);
    (0, utils_js_1.assert)(pathnameOriginal.endsWith(getPageContextRequestUrl_js_1.pageContextJsonFileExtension) === pathname.endsWith(getPageContextRequestUrl_js_1.pageContextJsonFileExtension), {
        url
    });
    return pathnameOriginal.endsWith(getPageContextRequestUrl_js_1.pageContextJsonFileExtension);
}
function removePageContextUrlSuffix(url) {
    const urlParsed = (0, utils_js_1.parseUrl)(url, utils_js_1.baseServer);
    // We cannot use `urlParsed.pathname` because it would break the `urlParsed.pathnameOriginal` value of subsequent `parseUrl()` calls.
    const { origin, pathnameOriginal, searchOriginal, hashOriginal } = urlParsed;
    (0, utils_js_1.assert)(getPageContextRequestUrl_js_1.doNotCreateExtraDirectory === false);
    const urlSuffix = `/index${getPageContextRequestUrl_js_1.pageContextJsonFileExtension}`;
    (0, utils_js_1.assert)(pathnameOriginal.endsWith(urlSuffix), { url });
    let pathnameModified = (0, utils_js_1.slice)(pathnameOriginal, 0, -1 * urlSuffix.length);
    if (pathnameModified === '')
        pathnameModified = '/';
    (0, utils_js_1.assert)(url === `${origin || ''}${pathnameOriginal}${searchOriginal || ''}${hashOriginal || ''}`, { url });
    return `${origin || ''}${pathnameModified}${searchOriginal || ''}${hashOriginal || ''}`;
}
