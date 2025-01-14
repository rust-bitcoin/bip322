"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorPage = exports.isErrorPageId = exports.getErrorPageId = void 0;
// TODO/v1-release: consider loading this file only for Client Routing
const utils_js_1 = require("./utils.js");
function getErrorPageId(pageFilesAll, pageConfigs) {
    if (pageConfigs.length > 0) {
        const errorPageConfigs = pageConfigs.filter((p) => p.isErrorPage);
        if (errorPageConfigs.length === 0)
            return null;
        (0, utils_js_1.assertUsage)(errorPageConfigs.length === 1, 'Only one error page can be defined');
        return errorPageConfigs[0].pageId;
    }
    // TODO/v1-release: remove
    const errorPageIds = (0, utils_js_1.unique)(pageFilesAll.map(({ pageId }) => pageId).filter((pageId) => isErrorPageId(pageId, false)));
    (0, utils_js_1.assertUsage)(errorPageIds.length <= 1, `Only one _error.page.js is allowed, but found several: ${errorPageIds.join(' ')}`);
    if (errorPageIds.length > 0) {
        const errorPageId = errorPageIds[0];
        (0, utils_js_1.assert)(errorPageId);
        return errorPageId;
    }
    return null;
}
exports.getErrorPageId = getErrorPageId;
// TODO/v1-release: remove
function isErrorPageId(pageId, _isV1Design) {
    (0, utils_js_1.assert)(!pageId.includes('\\'));
    return pageId.includes('/_error');
}
exports.isErrorPageId = isErrorPageId;
function isErrorPage(pageId, pageConfigs) {
    if (pageConfigs.length > 0) {
        const pageConfig = pageConfigs.find((p) => p.pageId === pageId);
        (0, utils_js_1.assert)(pageConfig);
        return pageConfig.isErrorPage;
    }
    else {
        return isErrorPageId(pageId, false);
    }
}
exports.isErrorPage = isErrorPage;
