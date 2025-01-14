export { assertRuntimeManifest };
import { assert, castType, checkType, hasProp, isBaseAssets, isBaseServer, isObject } from './utils.js';
function assertRuntimeManifest(obj) {
    assert(obj);
    assert(isObject(obj));
    assert(hasProp(obj, 'baseServer', 'string'));
    assert(hasProp(obj, 'baseAssets', 'string'));
    assert(isBaseServer(obj.baseServer));
    assert(isBaseAssets(obj.baseAssets));
    assert(hasProp(obj, 'includeAssetsImportedByServer', 'boolean'));
    assert(hasProp(obj, 'redirects', 'object'));
    castType(obj);
    assert(hasProp(obj, 'trailingSlash', 'boolean'));
    assert(hasProp(obj, 'disableUrlNormalization', 'boolean'));
    checkType(obj);
}
