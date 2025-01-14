export { assertPageConfigs };
export { assertPageConfigGlobal };
import { assert, isObject, hasProp } from '../utils.js';
function assertPageConfigs(pageConfigs) {
    assert(Array.isArray(pageConfigs));
    pageConfigs.forEach((pageConfig) => {
        assert(isObject(pageConfig));
        assert(hasProp(pageConfig, 'pageId', 'string'));
        assert(hasProp(pageConfig, 'routeFilesystem'));
    });
}
function assertPageConfigGlobal(pageConfigGlobal) {
    assert(pageConfigGlobal);
    assert(hasProp(pageConfigGlobal, 'onBeforeRoute'));
    assert(hasProp(pageConfigGlobal, 'onPrerenderStart'));
}
