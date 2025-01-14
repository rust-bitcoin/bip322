"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addIs404ToPageProps = void 0;
const utils_js_1 = require("./utils.js");
const error_page_js_1 = require("./error-page.js");
function addIs404ToPageProps(pageContext) {
    assertIs404(pageContext);
    addIs404(pageContext);
}
exports.addIs404ToPageProps = addIs404ToPageProps;
function assertIs404(pageContext) {
    if ((0, error_page_js_1.isErrorPage)(pageContext._pageId, pageContext._pageConfigs)) {
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContext, 'is404', 'boolean'));
    }
}
function addIs404(pageContext) {
    if (pageContext.is404 === undefined || pageContext.is404 === null)
        return;
    const pageProps = pageContext.pageProps || {};
    if (!(0, utils_js_1.isObject)(pageProps)) {
        (0, utils_js_1.assertWarning)(false, 'pageContext.pageProps should be an object', { showStackTrace: true, onlyOnce: true });
        return;
    }
    pageProps.is404 = pageProps.is404 || pageContext.is404;
    pageContext.pageProps = pageProps;
}
