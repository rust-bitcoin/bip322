// URLs props need to be computed props, because the user can modify the URL e.g. with onBeforeRoute() for i18n
export { addUrlComputedProps };
export { assertPageContextUrlComputedProps };
import { assert, parseUrl, assertWarning, isPlainObject, hasPropertyGetter, isBrowser } from './utils.js';
function addUrlComputedProps(pageContext, enumerable = true) {
    assert(pageContext.urlOriginal);
    if ('urlPathname' in pageContext) {
        assert(hasPropertyGetter(pageContext, 'urlPathname'));
    }
    Object.defineProperty(pageContext, 'urlPathname', {
        get: urlPathnameGetter,
        enumerable,
        configurable: true
    });
    // TODO/v1-release: move pageContext.urlParsed to pageContext.url
    if ('url' in pageContext)
        assert(hasPropertyGetter(pageContext, 'url'));
    Object.defineProperty(pageContext, 'url', {
        get: urlGetter,
        enumerable: false,
        configurable: true
    });
    if ('urlParsed' in pageContext) {
        assert(hasPropertyGetter(pageContext, 'urlParsed'));
    }
    Object.defineProperty(pageContext, 'urlParsed', {
        get: urlParsedGetter,
        enumerable,
        configurable: true
    });
}
function getUrlParsed(pageContext) {
    // We use a url handler function because the onBeforeRoute() hook may modify pageContext.urlOriginal (e.g. for i18n)
    let urlHandler = pageContext._urlHandler;
    if (!urlHandler) {
        urlHandler = (url) => url;
    }
    const url = pageContext._urlRewrite ?? pageContext.urlOriginal;
    assert(url && typeof url === 'string');
    const urlLogical = urlHandler(url);
    const baseServer = pageContext._baseServer;
    assert(baseServer.startsWith('/'));
    return parseUrl(urlLogical, baseServer);
}
function urlPathnameGetter() {
    const { pathname } = getUrlParsed(this);
    const urlPathname = pathname;
    assert(urlPathname.startsWith('/'));
    return urlPathname;
}
function urlGetter() {
    // TODO/v1-release: remove
    assertWarning(false, '`pageContext.url` is outdated. Use `pageContext.urlPathname`, `pageContext.urlParsed`, or `pageContext.urlOriginal` instead. (See https://vite-plugin-ssr.com/migration/0.4.23 for more information.)', { onlyOnce: true, showStackTrace: true });
    return urlPathnameGetter.call(this);
}
function urlParsedGetter() {
    const urlParsedOriginal = getUrlParsed(this);
    const { origin, pathname, pathnameOriginal, search, searchAll, searchOriginal, hash, hashOriginal } = urlParsedOriginal;
    const hashIsAvailable = isBrowser();
    const warnHashNotAvailable = (prop) => {
        assertWarning(hashIsAvailable, `pageContext.urlParsed.${prop} isn't available on the server-side (HTTP requests don't include the URL hash by design)`, { onlyOnce: true, showStackTrace: true });
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
            assertWarning(false, 'pageContext.urlParsed.hashString has been renamed to pageContext.urlParsed.hashOriginal', {
                onlyOnce: true,
                showStackTrace: true
            });
            warnHashNotAvailable('hashString');
            return hashOriginal;
        },
        get searchString() {
            assertWarning(false, 'pageContext.urlParsed.searchString has been renamed to pageContext.urlParsed.searchOriginal', { onlyOnce: true, showStackTrace: true });
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
    assert(typeof pageContext.urlOriginal === 'string');
    assert(typeof pageContext.urlPathname === 'string');
    assert(isPlainObject(pageContext.urlParsed));
    assert(pageContext.urlPathname === pageContext.urlParsed.pathname);
}
