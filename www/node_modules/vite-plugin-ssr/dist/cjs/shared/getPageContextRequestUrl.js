"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doNotCreateExtraDirectory = exports.pageContextJsonFileExtension = exports.getPageContextRequestUrl = void 0;
// This module isn't loaded by the client-side of Server Routing => we don't inlcude `urlToFile` to `./utils.ts`
const urlToFile_js_1 = require("../utils/urlToFile.js");
const pageContextJsonFileExtension = '.pageContext.json';
exports.pageContextJsonFileExtension = pageContextJsonFileExtension;
// `/some-base-url/index.pageContext.json` instead of `/some-base-url.pageContext.json` in order to comply to common reverse proxy setups, see https://github.com/brillout/vite-plugin-ssr/issues/443
const doNotCreateExtraDirectory = false;
exports.doNotCreateExtraDirectory = doNotCreateExtraDirectory;
// See node/renderPage/handlePageContextRequestUrl.ts
function getPageContextRequestUrl(url) {
    const pageContextRequestUrl = (0, urlToFile_js_1.urlToFile)(url, pageContextJsonFileExtension, doNotCreateExtraDirectory);
    return pageContextRequestUrl;
}
exports.getPageContextRequestUrl = getPageContextRequestUrl;
