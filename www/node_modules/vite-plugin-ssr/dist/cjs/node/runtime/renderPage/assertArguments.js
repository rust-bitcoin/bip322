"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertArguments = void 0;
const utils_js_1 = require("../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function assertArguments(...args) {
    const prefix = `[renderPage(${picocolors_1.default.cyan('pageContextInit')})]`;
    const pageContextInit = args[0];
    (0, utils_js_1.assertUsage)(pageContextInit !== undefined && pageContextInit !== null, prefix + ` argument ${picocolors_1.default.cyan('pageContextInit')} is missing`, { showStackTrace: true });
    const len = args.length;
    (0, utils_js_1.assertUsage)(len === 1, `${prefix} You passed ${len} arguments but renderPage() accepts only one argument.'`, {
        showStackTrace: true
    });
    (0, utils_js_1.assertUsage)((0, utils_js_1.isObject)(pageContextInit), `${prefix} ${picocolors_1.default.cyan('pageContextInit')} should be an object, but ${picocolors_1.default.cyan(`typeof pageContextInit === ${JSON.stringify(typeof pageContextInit)}`)}`, { showStackTrace: true });
    // TODO/v1-release: remove
    if ('url' in pageContextInit) {
        (0, utils_js_1.assertWarning)(false, '`pageContextInit.url` has been renamed to `pageContextInit.urlOriginal`: replace `renderPage({ url })` with `renderPage({ urlOriginal })`. (See https://vite-plugin-ssr.com/migration/0.4.23 for more information.)', { showStackTrace: true, onlyOnce: true });
        pageContextInit.urlOriginal = pageContextInit.url;
        delete pageContextInit.url;
    }
    (0, utils_js_1.assert)(!('url' in pageContextInit));
    (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(pageContextInit, 'urlOriginal'), prefix + ` ${picocolors_1.default.cyan('pageContextInit')} is missing the property ${picocolors_1.default.cyan('pageContextInit.urlOriginal')}`, { showStackTrace: true });
    const { urlOriginal } = pageContextInit;
    (0, utils_js_1.assertUsage)(typeof urlOriginal === 'string', prefix +
        ` ${picocolors_1.default.cyan('pageContextInit.urlOriginal')} should be a string but ${picocolors_1.default.cyan(`typeof pageContextInit.urlOriginal === ${JSON.stringify(typeof urlOriginal)}`)}`, { showStackTrace: true });
    (0, utils_js_1.assertUsage)(urlOriginal.startsWith('/') || urlOriginal.startsWith('https://') || urlOriginal.startsWith('http://'), prefix +
        ` ${picocolors_1.default.cyan('pageContextInit.urlOriginal')} should start with ${picocolors_1.default.cyan('/')} (e.g. ${picocolors_1.default.cyan('/product/42')}), ${picocolors_1.default.cyan('http://')}, or ${picocolors_1.default.cyan('https://')} (e.g. ${picocolors_1.default.cyan('https://example.com/product/42')}), but ${picocolors_1.default.cyan(`pageContextInit.urlOriginal === ${JSON.stringify(urlOriginal)}`)}`, { showStackTrace: true });
    const urlOriginalWithoutOrigin = urlOriginal.startsWith('http')
        ? urlOriginal
        : 'http://fake-origin.example.org' + urlOriginal;
    try {
        // We use `new URL()` to validate the URL. (`new URL(url)` throws an error if `url` isn't a valid URL.)
        new URL(urlOriginalWithoutOrigin);
    }
    catch (err) {
        (0, utils_js_1.assertUsage)(false, prefix +
            ` ${picocolors_1.default.cyan('pageContextInit.urlOriginal')} should be a URL but ${picocolors_1.default.cyan(`pageContextInit.urlOriginal === ${JSON.stringify(urlOriginal)}`)}`, { showStackTrace: true });
    }
}
exports.assertArguments = assertArguments;
