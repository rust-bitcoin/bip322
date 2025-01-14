"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPageContextProvidedByUser = void 0;
const utils_js_1 = require("./utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function assertPageContextProvidedByUser(pageContextProvidedByUser, { hookName, hookFilePath }) {
    if (pageContextProvidedByUser === undefined || pageContextProvidedByUser === null)
        return;
    (0, utils_js_1.assert)(!hookName.endsWith(')'));
    const errPrefix = `The ${picocolors_1.default.cyan('pageContext')} object provided by the ${hookName}() hook defined by ${hookFilePath}`;
    (0, utils_js_1.assertUsage)((0, utils_js_1.isObject)(pageContextProvidedByUser), `${errPrefix} should be an object (but it's ${picocolors_1.default.cyan(`typeof pageContext === ${JSON.stringify(typeof pageContextProvidedByUser)}`)} instead)`);
    (0, utils_js_1.assertUsage)(!('_objectCreatedByVitePluginSsr' in pageContextProvidedByUser), `${errPrefix} shouldn't be the whole ${picocolors_1.default.cyan('pageContext')} object, see https://vite-plugin-ssr.com/pageContext-manipulation#do-not-return-entire-pagecontext`);
    // In principle, it's possible to use onBeforeRoute()` to override and define the whole routing.
    // Is that a good idea to allow users to do this? Beyond deep integration with Vue Router or React Router, is there a use case for this?
    (0, utils_js_1.assertWarning)(!('_pageId' in pageContextProvidedByUser), `${errPrefix} sets ${picocolors_1.default.cyan('pageContext._pageId')} which means that vite-plugin-ssr's routing is overriden. This is an experimental feature: make sure to contact a vite-plugin-ssr maintainer before using this.`, { onlyOnce: true });
    (0, utils_js_1.assertUsage)(!('is404' in pageContextProvidedByUser), `${errPrefix} sets ${picocolors_1.default.cyan('pageContext.is404')} which is forbidden, use ${picocolors_1.default.cyan('throw render()')} instead, see https://vite-plugin-ssr.com/render`);
}
exports.assertPageContextProvidedByUser = assertPageContextProvidedByUser;
