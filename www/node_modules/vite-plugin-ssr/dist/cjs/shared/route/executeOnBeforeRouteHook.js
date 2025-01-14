"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeOnBeforeRouteHook = void 0;
const assertPageContextProvidedByUser_js_1 = require("../assertPageContextProvidedByUser.js");
const utils_js_1 = require("./utils.js");
const resolveRouteFunction_js_1 = require("./resolveRouteFunction.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function executeOnBeforeRouteHook(onBeforeRouteHook, pageContext) {
    let hookReturn = onBeforeRouteHook.onBeforeRoute(pageContext);
    (0, resolveRouteFunction_js_1.assertSyncRouting)(hookReturn, `The onBeforeRoute() hook ${onBeforeRouteHook.hookFilePath}`);
    hookReturn = await hookReturn;
    const errPrefix = `The onBeforeRoute() hook defined by ${onBeforeRouteHook.hookFilePath}`;
    (0, utils_js_1.assertUsage)(hookReturn === null ||
        hookReturn === undefined ||
        ((0, utils_js_1.isObjectWithKeys)(hookReturn, ['pageContext']) && (0, utils_js_1.hasProp)(hookReturn, 'pageContext')), `${errPrefix} should return ${picocolors_1.default.cyan('null')}, ${picocolors_1.default.cyan('undefined')}, or a plain JavaScript object ${picocolors_1.default.cyan('{ pageContext: { /* ... */ } }')}`);
    if (hookReturn === null || hookReturn === undefined) {
        return null;
    }
    (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(hookReturn, 'pageContext', 'object'), `${errPrefix} returned ${picocolors_1.default.cyan('{ pageContext }')} but pageContext should be a plain JavaScript object.`);
    if ((0, utils_js_1.hasProp)(hookReturn.pageContext, '_pageId') && !(0, utils_js_1.hasProp)(hookReturn.pageContext, '_pageId', 'null')) {
        const errPrefix2 = `${errPrefix} returned ${picocolors_1.default.cyan('{ pageContext: { _pageId } }')} but ${picocolors_1.default.cyan('_pageId')} should be`;
        (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(hookReturn.pageContext, '_pageId', 'string'), `${errPrefix2} a string or null`);
        (0, utils_js_1.assertUsage)(pageContext._allPageIds.includes(hookReturn.pageContext._pageId), `${errPrefix2} ${(0, utils_js_1.joinEnglish)(pageContext._allPageIds.map((s) => picocolors_1.default.cyan(s)), 'or')}`);
    }
    if ((0, utils_js_1.hasProp)(hookReturn.pageContext, 'routeParams')) {
        (0, resolveRouteFunction_js_1.assertRouteParams)(hookReturn.pageContext, `${errPrefix} returned ${picocolors_1.default.cyan('{ pageContext: { routeParams } }')} but routeParams should`);
    }
    const pageContextAddendumHook = {};
    if ((0, utils_js_1.hasProp)(hookReturn.pageContext, 'url')) {
        (0, utils_js_1.assertWarning)(false, `${errPrefix} returned ${picocolors_1.default.cyan('{ pageContext: { url } }')} but ${picocolors_1.default.cyan('pageContext.url')} has been renamed to ${picocolors_1.default.cyan('pageContext.urlOriginal')}. Return ${picocolors_1.default.cyan('{ pageContext: { urlOriginal } }')} instead. (See https://vite-plugin-ssr.com/migration/0.4.23 for more information.)`, { onlyOnce: true });
        hookReturn.pageContext.urlOriginal = hookReturn.pageContext.url;
        delete hookReturn.pageContext.url;
    }
    if ((0, utils_js_1.hasProp)(hookReturn.pageContext, 'urlOriginal')) {
        (0, utils_js_1.assertUsageUrl)(hookReturn.pageContext.urlOriginal, `${errPrefix} returned ${picocolors_1.default.cyan('{ pageContext: { urlOriginal } }')} but ${picocolors_1.default.cyan('urlOriginal')}`);
        // Ugly workaround: ideally urlOriginal should be immutable.
        //  - Instead of using pageContext._urlOriginalPristine, maybe we can keep pageContext.urlOriginal immutable while re-using `pageContext._urlRewrite`.
        //  - Or better yet we rename pageContext._urlRewrite to pageContext.urlLogical and we allow the user to override pageContext.urlLogical, and we rename pageContext.urlOriginal => `pageContext.urlReal`.
        //    - pageContext.urlReal / pageContext.urlLogical
        //                         VS
        //      pageContext.urlReal / pageContext.urlModified
        //                         VS
        //      pageContext.urlOriginal / pageContext.urlModified
        (0, utils_js_1.objectAssign)(pageContextAddendumHook, { _urlOriginalPristine: pageContext.urlOriginal });
    }
    (0, assertPageContextProvidedByUser_js_1.assertPageContextProvidedByUser)(hookReturn.pageContext, {
        hookFilePath: onBeforeRouteHook.hookFilePath,
        hookName: 'onBeforeRoute'
    });
    (0, utils_js_1.objectAssign)(pageContextAddendumHook, hookReturn.pageContext);
    return pageContextAddendumHook;
}
exports.executeOnBeforeRouteHook = executeOnBeforeRouteHook;
