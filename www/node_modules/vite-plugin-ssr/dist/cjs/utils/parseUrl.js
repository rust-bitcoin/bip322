"use strict";
// We don't use new URL() as it doesn't exactly do what we need, for example:
//  - It loses the original URL parts (which we need to manipulate and recreate URLs)
//  - It doesn't support the tauri:// protocol
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUrlFromComponents = exports.assertUrlComponents = exports.isBaseServer = exports.assertUsageUrl = exports.isParsable = exports.parseUrl = void 0;
const slice_js_1 = require("./slice.js");
const assert_js_1 = require("./assert.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const PROTOCOLS = ['http://', 'https://', 'tauri://'];
function isParsable(url) {
    // `parseUrl()` works with these URLs
    return (PROTOCOLS.some((p) => url.startsWith(p)) ||
        url.startsWith('/') ||
        url.startsWith('.') ||
        url.startsWith('?') ||
        url.startsWith('#') ||
        url === '');
}
exports.isParsable = isParsable;
function assertUsageUrl(url, errPrefix) {
    (0, assert_js_1.assert)(errPrefix.includes(' but '));
    (0, assert_js_1.assertUsage)(typeof url === 'string', `${errPrefix} should be a string`);
    if (isParsable(url))
        return;
    if (!url.startsWith('/') && !url.includes(':')) {
        (0, assert_js_1.assertUsage)(false, `${errPrefix} is ${picocolors_1.default.cyan(url)} and it should be /${picocolors_1.default.cyan(url)} instead (URL pathnames should start with a leading slash)`);
    }
    else {
        (0, assert_js_1.assertUsage)(false, `${errPrefix} isn't a valid URL`);
    }
}
exports.assertUsageUrl = assertUsageUrl;
function parseUrl(url, baseServer) {
    (0, assert_js_1.assert)(isParsable(url));
    (0, assert_js_1.assert)(baseServer.startsWith('/'));
    // Hash
    const [urlWithoutHash, ...hashList] = url.split('#');
    (0, assert_js_1.assert)(urlWithoutHash !== undefined);
    const hashOriginal = ['', ...hashList].join('#') || null;
    (0, assert_js_1.assert)(hashOriginal === null || hashOriginal.startsWith('#'));
    const hash = hashOriginal === null ? '' : decodeSafe(hashOriginal.slice(1));
    // Search
    const [urlWithoutHashNorSearch, ...searchList] = urlWithoutHash.split('?');
    (0, assert_js_1.assert)(urlWithoutHashNorSearch !== undefined);
    const searchOriginal = ['', ...searchList].join('?') || null;
    (0, assert_js_1.assert)(searchOriginal === null || searchOriginal.startsWith('?'));
    const search = {};
    const searchAll = {};
    Array.from(new URLSearchParams(searchOriginal || '')).forEach(([key, val]) => {
        search[key] = val;
        searchAll[key] = [...(searchAll[key] || []), val];
    });
    // Origin + pathname
    const { origin, pathname: pathnameResolved } = parsePathname(urlWithoutHashNorSearch, baseServer);
    (0, assert_js_1.assert)(origin === null || origin === decodeSafe(origin)); // AFAICT decoding the origin is useless
    (0, assert_js_1.assert)(pathnameResolved.startsWith('/'));
    (0, assert_js_1.assert)(origin === null || url.startsWith(origin));
    // `pathnameOriginal`
    const pathnameOriginal = urlWithoutHashNorSearch.slice((origin || '').length);
    assertUrlComponents(url, origin, pathnameOriginal, searchOriginal, hashOriginal);
    // Base URL
    let { pathname, hasBaseServer } = analyzeBaseServer(pathnameResolved, baseServer);
    pathname = decodePathname(pathname);
    (0, assert_js_1.assert)(pathname.startsWith('/'));
    return {
        origin,
        pathname,
        pathnameOriginal: pathnameOriginal,
        hasBaseServer,
        search,
        searchAll,
        searchOriginal,
        hash,
        hashOriginal
    };
}
exports.parseUrl = parseUrl;
function decodeSafe(urlComponent) {
    try {
        return decodeURIComponent(urlComponent);
    }
    catch { }
    try {
        return decodeURI(urlComponent);
    }
    catch { }
    return urlComponent;
}
function decodePathname(urlPathname) {
    urlPathname = urlPathname
        .split('/')
        .map((dir) => decodeSafe(dir).split('/').join('%2F'))
        .join('/');
    urlPathname = urlPathname.replace(/\s/g, '');
    return urlPathname;
}
function parsePathname(urlWithoutHashNorSearch, baseServer) {
    {
        const { origin, pathname } = parseOrigin(urlWithoutHashNorSearch);
        if (origin) {
            return { origin, pathname };
        }
        (0, assert_js_1.assert)(pathname === urlWithoutHashNorSearch);
    }
    if (urlWithoutHashNorSearch.startsWith('/')) {
        return { origin: null, pathname: urlWithoutHashNorSearch };
    }
    else {
        // In the browser, this is the Base URL of the current URL
        // Safe access `window?.document?.baseURI` for users who shim `window` in Node.js
        const base = (typeof window !== 'undefined' && window?.document?.baseURI) || baseServer;
        const pathname = resolveUrlPathnameRelative(urlWithoutHashNorSearch, base);
        // We need to parse the origin in case `base === window.document.baseURI`
        const parsed = parseOrigin(pathname);
        return parsed;
    }
}
function parseOrigin(url) {
    if (!PROTOCOLS.some((protocol) => url.startsWith(protocol))) {
        return { pathname: url, origin: null };
    }
    else {
        const [originPart1, originPart2, originPart3, ...pathnameParts] = url.split('/');
        const origin = [originPart1, originPart2, originPart3].join('/');
        const pathname = ['', ...pathnameParts].join('/') || '/';
        return { origin, pathname };
    }
}
// Adapted from https://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript/14780463#14780463
function resolveUrlPathnameRelative(pathnameRelative, base) {
    const stack = base.split('/');
    const parts = pathnameRelative.split('/');
    let baseRestoreTrailingSlash = base.endsWith('/');
    if (pathnameRelative.startsWith('.')) {
        // remove current file name
        stack.pop();
    }
    for (const i in parts) {
        const p = parts[i];
        if (p == '' && i === '0')
            continue;
        if (p == '.')
            continue;
        if (p == '..')
            stack.pop();
        else {
            baseRestoreTrailingSlash = false;
            stack.push(p);
        }
    }
    let pathnameAbsolute = stack.join('/');
    if (baseRestoreTrailingSlash && !pathnameAbsolute.endsWith('/'))
        pathnameAbsolute += '/';
    return pathnameAbsolute;
}
/* Not needed anymore?
function assertUsageBaseServer(baseServer: string, usageErrorMessagePrefix: string = '') {
  assertUsage(
    !baseServer.startsWith('http'),
    usageErrorMessagePrefix +
      '`base` is not allowed to start with `http`. Consider using `baseAssets` instead, see https://vite-plugin-ssr.com/base-url'
  )
  assertUsage(
    baseServer.startsWith('/'),
    usageErrorMessagePrefix + 'Wrong `base` value `' + baseServer + '`; `base` should start with `/`.'
  )
  assert(isBaseServer(baseServer))
}
*/
function assertPathname(urlPathname) {
    (0, assert_js_1.assert)(urlPathname.startsWith('/'));
    (0, assert_js_1.assert)(!urlPathname.includes('?'));
    (0, assert_js_1.assert)(!urlPathname.includes('#'));
}
function analyzeBaseServer(urlPathnameWithBase, baseServer) {
    assertPathname(urlPathnameWithBase);
    (0, assert_js_1.assert)(isBaseServer(baseServer));
    // Mutable
    let urlPathname = urlPathnameWithBase;
    (0, assert_js_1.assert)(urlPathname.startsWith('/'));
    (0, assert_js_1.assert)(baseServer.startsWith('/'));
    if (baseServer === '/') {
        const pathname = urlPathnameWithBase;
        return { pathname, hasBaseServer: true };
    }
    // Support `url === '/some-base-url' && baseServer === '/some-base-url/'`
    let baseServerNormalized = baseServer;
    if (baseServer.endsWith('/') && urlPathname === (0, slice_js_1.slice)(baseServer, 0, -1)) {
        baseServerNormalized = (0, slice_js_1.slice)(baseServer, 0, -1);
        (0, assert_js_1.assert)(urlPathname === baseServerNormalized);
    }
    if (!urlPathname.startsWith(baseServerNormalized)) {
        const pathname = urlPathnameWithBase;
        return { pathname, hasBaseServer: false };
    }
    (0, assert_js_1.assert)(urlPathname.startsWith('/') || urlPathname.startsWith('http'));
    (0, assert_js_1.assert)(urlPathname.startsWith(baseServerNormalized));
    urlPathname = urlPathname.slice(baseServerNormalized.length);
    if (!urlPathname.startsWith('/'))
        urlPathname = '/' + urlPathname;
    (0, assert_js_1.assert)(urlPathname.startsWith('/'));
    return { pathname: urlPathname, hasBaseServer: true };
}
function isBaseServer(baseServer) {
    return baseServer.startsWith('/');
}
exports.isBaseServer = isBaseServer;
function assertUrlComponents(url, origin, pathname, searchOriginal, hashOriginal) {
    const urlRecreated = createUrlFromComponents(origin, pathname, searchOriginal, hashOriginal);
    (0, assert_js_1.assert)(url === urlRecreated);
}
exports.assertUrlComponents = assertUrlComponents;
function createUrlFromComponents(origin, pathname, searchOriginal, hashOriginal) {
    const urlRecreated = `${origin || ''}${pathname}${searchOriginal || ''}${hashOriginal || ''}`;
    return urlRecreated;
}
exports.createUrlFromComponents = createUrlFromComponents;
