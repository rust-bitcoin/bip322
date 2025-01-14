export { findPageConfig };
import { assert } from '../utils.js';
function findPageConfig(pageConfigs, pageId) {
    const result = pageConfigs.filter((p) => p.pageId === pageId);
    assert(result.length <= 1);
    const pageConfig = result[0] ?? null;
    return pageConfig;
}
