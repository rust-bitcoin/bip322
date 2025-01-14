export { prependBase };
export { isBaseAssets };
export { normalizeUrlPathname };
export { removeBaseServer };
export { modifyUrlPathname };
export { removeUrlOrigin };
export { addUrlOrigin };
import { assertUrlComponents, createUrlFromComponents, isBaseServer, parseUrl } from './parseUrl.js';
import { assert } from './assert.js';
import { slice } from './slice.js';
import { assertIsNotBrowser } from './assertIsNotBrowser.js';
assertIsNotBrowser();
function prependBase(url, baseServer) {
    if (baseServer.startsWith('http')) {
        const baseAssets = baseServer;
        const baseAssetsNormalized = normalizeBaseAssets(baseAssets);
        assert(!baseAssetsNormalized.endsWith('/'));
        assert(url.startsWith('/'));
        return `${baseAssetsNormalized}${url}`;
    }
    assert(isBaseServer(baseServer));
    const baseServerNormalized = normalizeBaseServer(baseServer);
    if (baseServerNormalized === '/')
        return url;
    assert(!baseServerNormalized.endsWith('/'));
    assert(url.startsWith('/'));
    return `${baseServerNormalized}${url}`;
}
function removeBaseServer(url, baseServer) {
    const { hasBaseServer, origin, pathname, pathnameOriginal, searchOriginal, hashOriginal } = parseUrl(url, baseServer);
    assert(hasBaseServer);
    assertUrlComponents(url, origin, pathnameOriginal, searchOriginal, hashOriginal);
    const urlWithoutBase = createUrlFromComponents(origin, pathname, searchOriginal, hashOriginal);
    return urlWithoutBase;
}
function normalizeBaseAssets(baseAssets) {
    let baseAssetsNormalized = baseAssets;
    if (baseAssetsNormalized.endsWith('/')) {
        baseAssetsNormalized = slice(baseAssetsNormalized, 0, -1);
    }
    assert(!baseAssetsNormalized.endsWith('/'));
    return baseAssetsNormalized;
}
function normalizeBaseServer(baseServer) {
    let baseServerNormalized = baseServer;
    if (baseServerNormalized.endsWith('/') && baseServerNormalized !== '/') {
        baseServerNormalized = slice(baseServerNormalized, 0, -1);
    }
    // We can and should expect `baseServer` to not contain `/` doublets.
    assert(!baseServerNormalized.endsWith('/') || baseServerNormalized === '/');
    return baseServerNormalized;
}
function isBaseAssets(base) {
    return base.startsWith('/') || base.startsWith('http://') || base.startsWith('https://');
}
function normalizeUrlPathname(urlOriginal, trailingSlash) {
    const urlNormalized = modifyUrlPathname(urlOriginal, (urlPathname) => {
        assert(urlPathname.startsWith('/'));
        let urlPathnameNormalized = '/' + urlPathname.split('/').filter(Boolean).join('/');
        if (urlPathnameNormalized !== '/') {
            assert(!urlPathnameNormalized.endsWith('/'));
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
function modifyUrlPathname(url, modifier) {
    const { origin, pathnameOriginal, searchOriginal, hashOriginal } = parseUrl(url, '/');
    const pathnameModified = modifier(pathnameOriginal);
    if (pathnameModified === null)
        return url;
    assertUrlComponents(url, origin, pathnameOriginal, searchOriginal, hashOriginal);
    const urlModified = createUrlFromComponents(origin, pathnameModified, searchOriginal, hashOriginal);
    assert((pathnameOriginal === pathnameModified) === (url === urlModified));
    return urlModified;
}
function removeUrlOrigin(url) {
    const { origin, pathnameOriginal, searchOriginal, hashOriginal } = parseUrl(url, '/');
    const urlModified = createUrlFromComponents(null, pathnameOriginal, searchOriginal, hashOriginal);
    return { urlModified, origin };
}
function addUrlOrigin(url, origin) {
    const { origin: originCurrent, pathnameOriginal, searchOriginal, hashOriginal } = parseUrl(url, '/');
    assert(originCurrent === null);
    assert(origin === null || origin.startsWith('http'));
    const urlModified = createUrlFromComponents(origin, pathnameOriginal, searchOriginal, hashOriginal);
    return urlModified;
}
