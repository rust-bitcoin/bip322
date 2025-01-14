"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectAssets__public = void 0;
const utils_js_1 = require("../../utils.js");
const injectAssets_js_1 = require("../injectAssets.js");
// TODO: remove this on next semver major
async function injectAssets__public(htmlString, pageContext) {
    (0, utils_js_1.assertWarning)(false, '`_injectAssets()` is deprecated and will be removed.', { onlyOnce: true, showStackTrace: true });
    (0, utils_js_1.assertUsage)(typeof htmlString === 'string', '[injectAssets(htmlString, pageContext)]: Argument `htmlString` should be a string.', { showStackTrace: true });
    (0, utils_js_1.assertUsage)(pageContext, '[injectAssets(htmlString, pageContext)]: Argument `pageContext` is missing.', {
        showStackTrace: true
    });
    const errMsg = (body) => '[injectAssets(htmlString, pageContext)]: ' +
        body +
        '. Make sure that `pageContext` is the object that `vite-plugin-ssr` provided to your `render(pageContext)` hook.';
    (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(pageContext, 'urlPathname', 'string'), errMsg('`pageContext.urlPathname` should be a string'), {
        showStackTrace: true
    });
    (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(pageContext, '_pageId', 'string'), errMsg('`pageContext._pageId` should be a string'), {
        showStackTrace: true
    });
    (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(pageContext, '__getPageAssets'), errMsg('`pageContext.__getPageAssets` is missing'), {
        showStackTrace: true
    });
    (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(pageContext, '_passToClient', 'string[]'), errMsg('`pageContext._passToClient` is missing'), {
        showStackTrace: true
    });
    (0, utils_js_1.castProp)(pageContext, '__getPageAssets');
    htmlString = await (0, injectAssets_js_1.injectHtmlTagsToString)([htmlString], pageContext, null);
    return htmlString;
}
exports.injectAssets__public = injectAssets__public;
