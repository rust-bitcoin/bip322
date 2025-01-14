"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseServer = exports.urlToFile = void 0;
const assert_js_1 = require("./assert.js");
const parseUrl_js_1 = require("./parseUrl.js");
const slice_js_1 = require("./slice.js");
// - When doing a `.pageContext.json` HTTP request, the base URL should be preserved. (The server-side will handle the base URL.)
// - While prerendering there is no base URL
const baseServer = '/';
exports.baseServer = baseServer;
function urlToFile(url, fileExtension, doNotCreateExtraDirectory) {
    const { pathnameOriginal, searchOriginal, hashOriginal } = (0, parseUrl_js_1.parseUrl)(url, baseServer);
    if (url.startsWith('/')) {
        (0, assert_js_1.assert)(url === `${pathnameOriginal}${searchOriginal || ''}${hashOriginal || ''}`, { url });
    }
    const hasTrailingSlash = pathnameOriginal.endsWith('/');
    let pathnameModified;
    if (doNotCreateExtraDirectory && pathnameOriginal !== '/') {
        if (hasTrailingSlash) {
            pathnameModified = (0, slice_js_1.slice)(pathnameOriginal, 0, -1);
        }
        else {
            pathnameModified = pathnameOriginal;
        }
        (0, assert_js_1.assert)(!pathnameModified.endsWith('/'), { url });
        (0, assert_js_1.assert)(pathnameModified !== '');
    }
    else {
        pathnameModified = pathnameOriginal + (hasTrailingSlash ? '' : '/') + 'index';
    }
    (0, assert_js_1.assert)(pathnameModified);
    pathnameModified = pathnameModified + fileExtension;
    const fileUrl = `${pathnameModified}${searchOriginal || ''}${hashOriginal || ''}`;
    return fileUrl;
}
exports.urlToFile = urlToFile;
