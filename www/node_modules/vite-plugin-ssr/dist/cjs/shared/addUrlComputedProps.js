"use strict";
// URLs props need to be computed props, because the user can modify the URL e.g. with onBeforeRoute() for i18n
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPageContextUrlComputedProps = exports.addUrlComputedProps = void 0;
const utils_js_1 = require("./utils.js");
function addUrlComputedProps(pageContext, enumerable = true) {
    (0, utils_js_1.assert)(pageContext.urlOriginal);
    if ('urlPathname' in pageContext) {
        (0, utils_js_1.assert)((0, utils_js_1.hasPropertyGetter)(pageContext, 'urlPathname'));
    }
    Object.defineProperty(pageContext, 'urlPathname', {
        get: urlPathnameGetter,
        enumerable,
        configurable: true
    });
    // TODO/v1-release: move pageContext.urlParsed to pageContext.url
    if ('url' in pageContext)
        (0, utils_js_1.assert)((0, utils_js_1.hasPropertyGetter)(pageContext, 'url'));
    Object.defineProperty(pageContext, 'url', {
        get: urlGetter,
        enumerable: false,
        configurable: true
    });
    if ('urlParsed' in pageContext) {
        (0, utils_js_1.assert)((0, utils_js_1.hasPropertyGetter)(pageContext, 'urlParsed'));
    }
    Object.defineProperty(pageContext, 'urlParsed', {
        get: urlParsedGetter,
        enumerable,
        configurable: true
    });
}
exports.addUrlComputedProps = addUrlComputedProps;
function getUrlParsed(pageContext) {
    // We use a url handler function because the onBeforeRoute() hook may modify pageContext.urlOriginal (e.g. for i18n)
    let urlHandler = pageContext._urlHandler;
    if (!urlHandler) {
        urlHandler = (url) => url;
    }
    const url = pageContext._urlRewrite ?? pageContext.urlOriginal;
    (0, utils_js_1.assert)(url && typeof url === 'string');
    const urlLogical = urlHandler(url);
    const baseServer = pageContext._baseServer;
    (0, utils_js_1.assert)(baseServer.startsWith('/'));
    return (0, utils_js_1.parseUrl)(urlLogical, baseServer);
}
function urlPathnameGetter() {
    const { pathname } = getUrlParsed(this);
    const urlPathname = pathname;
    (0, utils_js_1.assert)(urlPathname.startsWith('/'));
    return urlPathname;
}
function urlGetter() {
    // TODO/v1-release: remove
    (0, utils_js_1.assertWarning)(false, '`pageContext.url` is outdated. Use `pageContext.urlPathname`, `pageContext.urlParsed`, or `pageContext.urlOriginal` instead. (See https://vite-plugin-ssr.com/migration/0.4.23 for more information.)', { onlyOnce: true, showStackTrace: true });
    return urlPathnameGetter.call(this);
}
function urlParsedGetter() {
    const urlParsedOriginal = getUrlParsed(this);
    const { origin, pathname, pathnameOriginal, search, searchAll, searchOriginal, hash, hashOriginal } = urlParsedOriginal;
    const hashIsAvailable = (0, utils_js_1.isBrowser)();
    const warnHashNotAvailable = (prop) => {
        (0, utils_js_1.assertWarning)(hashIsAvailable, `pageContext.urlParsed.${prop} isn't available on the server-side (HTTP requests don't include the URL hash by design)`, { onlyOnce: true, showStackTrace: true });
    };
    const urlParsed = {
        origin,
        pathname,
        pathnameOriginal,
        search,
        searchAll,
        searchOriginal,
        get hash() {
            warnHashNotAvailable('hash');
            return hash;
        },
        get hashOriginal() {
            warnHashNotAvailable('hashOriginal');
            return hashOriginal;
        },
        get hashString() {
            (0, utils_js_1.assertWarning)(false, 'pageContext.urlParsed.hashString has been renamed to pageContext.urlParsed.hashOriginal', {
                onlyOnce: true,
                showStackTrace: true
            });
            warnHashNotAvailable('hashString');
            return hashOriginal;
        },
        get searchString() {
            (0, utils_js_1.assertWarning)(false, 'pageContext.urlParsed.searchString has been renamed to pageContext.urlParsed.searchOriginal', { onlyOnce: true, showStackTrace: true });
            return searchOriginal;
        }
    };
    makeNonEnumerable(urlParsed, 'hashString');
    makeNonEnumerable(urlParsed, 'searchString');
    if (!hashIsAvailable) {
        makeNonEnumerable(urlParsed, 'hash');
        makeNonEnumerable(urlParsed, 'hashOriginal');
    }
    return urlParsed;
}
function makeNonEnumerable(obj, prop) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    Object.defineProperty(obj, prop, { ...descriptor, enumerable: false });
}
function assertPageContextUrlComputedProps(pageContext) {
    (0, utils_js_1.assert)(typeof pageContext.urlOriginal === 'string');
    (0, utils_js_1.assert)(typeof pageContext.urlPathname === 'string');
    (0, utils_js_1.assert)((0, utils_js_1.isPlainObject)(pageContext.urlParsed));
    (0, utils_js_1.assert)(pageContext.urlPathname === pageContext.urlParsed.pathname);
}
exports.assertPageContextUrlComputedProps = assertPageContextUrlComputedProps;
