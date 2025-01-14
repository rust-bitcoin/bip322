"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUrlOrigin = exports.removeUrlOrigin = exports.modifyUrlPathname = exports.removeBaseServer = exports.normalizeUrlPathname = exports.isBaseAssets = exports.prependBase = void 0;
const parseUrl_js_1 = require("./parseUrl.js");
const assert_js_1 = require("./assert.js");
const slice_js_1 = require("./slice.js");
const assertIsNotBrowser_js_1 = require("./assertIsNotBrowser.js");
(0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
function prependBase(url, baseServer) {
    if (baseServer.startsWith('http')) {
        const baseAssets = baseServer;
        const baseAssetsNormalized = normalizeBaseAssets(baseAssets);
        (0, assert_js_1.assert)(!baseAssetsNormalized.endsWith('/'));
        (0, assert_js_1.assert)(url.startsWith('/'));
        return `${baseAssetsNormalized}${url}`;
    }
    (0, assert_js_1.assert)((0, parseUrl_js_1.isBaseServer)(baseServer));
    const baseServerNormalized = normalizeBaseServer(baseServer);
    if (baseServerNormalized === '/')
        return url;
    (0, assert_js_1.assert)(!baseServerNormalized.endsWith('/'));
    (0, assert_js_1.assert)(url.startsWith('/'));
    return `${baseServerNormalized}${url}`;
}
exports.prependBase = prependBase;
function removeBaseServer(url, baseServer) {
    const { hasBaseServer, origin, pathname, pathnameOriginal, searchOriginal, hashOriginal } = (0, parseUrl_js_1.parseUrl)(url, baseServer);
    (0, assert_js_1.assert)(hasBaseServer);
    (0, parseUrl_js_1.assertUrlComponents)(url, origin, pathnameOriginal, searchOriginal, hashOriginal);
    const urlWithoutBase = (0, parseUrl_js_1.createUrlFromComponents)(origin, pathname, searchOriginal, hashOriginal);
    return urlWithoutBase;
}
exports.removeBaseServer = removeBaseServer;
function normalizeBaseAssets(baseAssets) {
    let baseAssetsNormalized = baseAssets;
    if (baseAssetsNormalized.endsWith('/')) {
        baseAssetsNormalized = (0, slice_js_1.slice)(baseAssetsNormalized, 0, -1);
    }
    (0, assert_js_1.assert)(!baseAssetsNormalized.endsWith('/'));
    return baseAssetsNormalized;
}
function normalizeBaseServer(baseServer) {
    let baseServerNormalized = baseServer;
    if (baseServerNormalized.endsWith('/') && baseServerNormalized !== '/') {
        baseServerNormalized = (0, slice_js_1.slice)(baseServerNormalized, 0, -1);
    }
    // We can and should expect `baseServer` to not contain `/` doublets.
    (0, assert_js_1.assert)(!baseServerNormalized.endsWith('/') || baseServerNormalized === '/');
    return baseServerNormalized;
}
function isBaseAssets(base) {
    return base.startsWith('/') || base.startsWith('http://') || base.startsWith('https://');
}
exports.isBaseAssets = isBaseAssets;
function normalizeUrlPathname(urlOriginal, trailingSlash) {
    const urlNormalized = modifyUrlPathname(urlOriginal, (urlPathname) => {
        (0, assert_js_1.assert)(urlPathname.startsWith('/'));
        let urlPathnameNormalized = '/' + urlPathname.split('/').filter(Boolean).join('/');
        if (urlPathnameNormalized !== '/') {
            (0, assert_js_1.assert)(!urlPathnameNormalized.endsWith('/'));
            if (trailingSlash) {
                urlPathnameNormalized = urlPathnameNormalized + '/';
            }
        }
        return urlPathnameNormalized;
    });
    if (urlNormalized === urlOriginal)
        return null;
    return urlNormalized;
}
exports.normalizeUrlPathname = normalizeUrlPathname;
function modifyUrlPathname(url, modifier) {
    const { origin, pathnameOriginal, searchOriginal, hashOriginal } = (0, parseUrl_js_1.parseUrl)(url, '/');
    const pathnameModified = modifier(pathnameOriginal);
    if (pathnameModified === null)
        return url;
    (0, parseUrl_js_1.assertUrlComponents)(url, origin, pathnameOriginal, searchOriginal, hashOriginal);
    const urlModified = (0, parseUrl_js_1.createUrlFromComponents)(origin, pathnameModified, searchOriginal, hashOriginal);
    (0, assert_js_1.assert)((pathnameOriginal === pathnameModified) === (url === urlModified));
    return urlModified;
}
exports.modifyUrlPathname = modifyUrlPathname;
function removeUrlOrigin(url) {
    const { origin, pathnameOriginal, searchOriginal, hashOriginal } = (0, parseUrl_js_1.parseUrl)(url, '/');
    const urlModified = (0, parseUrl_js_1.createUrlFromComponents)(null, pathnameOriginal, searchOriginal, hashOriginal);
    return { urlModified, origin };
}
exports.removeUrlOrigin = removeUrlOrigin;
function addUrlOrigin(url, origin) {
    const { origin: originCurrent, pathnameOriginal, searchOriginal, hashOriginal } = (0, parseUrl_js_1.parseUrl)(url, '/');
    (0, assert_js_1.assert)(originCurrent === null);
    (0, assert_js_1.assert)(origin === null || origin.startsWith('http'));
    const urlModified = (0, parseUrl_js_1.createUrlFromComponents)(origin, pathnameOriginal, searchOriginal, hashOriginal);
    return urlModified;
}
exports.addUrlOrigin = addUrlOrigin;
