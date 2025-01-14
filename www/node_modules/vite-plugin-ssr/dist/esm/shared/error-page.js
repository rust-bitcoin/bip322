export { getErrorPageId };
export { isErrorPageId };
export { isErrorPage };
// TODO/v1-release: consider loading this file only for Client Routing
import { assert, assertUsage, unique } from './utils.js';
function getErrorPageId(pageFilesAll, pageConfigs) {
    if (pageConfigs.length > 0) {
        const errorPageConfigs = pageConfigs.filter((p) => p.isErrorPage);
        if (errorPageConfigs.length === 0)
            return null;
        assertUsage(errorPageConfigs.length === 1, 'Only one error page can be defined');
        return errorPageConfigs[0].pageId;
    }
    // TODO/v1-release: remove
    const errorPageIds = unique(pageFilesAll.map(({ pageId }) => pageId).filter((pageId) => isErrorPageId(pageId, false)));
    assertUsage(errorPageIds.length <= 1, `Only one _error.page.js is allowed, but found several: ${errorPageIds.join(' ')}`);
    if (errorPageIds.length > 0) {
        const errorPageId = errorPageIds[0];
        assert(errorPageId);
        return errorPageId;
    }
    return null;
}
// TODO/v1-release: remove
function isErrorPageId(pageId, _isV1Design) {
    assert(!pageId.includes('\\'));
    return pageId.includes('/_error');
}
function isErrorPage(pageId, pageConfigs) {
    if (pageConfigs.length > 0) {
        const pageConfig = pageConfigs.find((p) => p.pageId === pageId);
        assert(pageConfig);
        return pageConfig.isErrorPage;
    }
    else {
        return isErrorPageId(pageId, false);
    }
}
