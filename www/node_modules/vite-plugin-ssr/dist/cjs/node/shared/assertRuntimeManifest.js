"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRuntimeManifest = void 0;
const utils_js_1 = require("./utils.js");
function assertRuntimeManifest(obj) {
    (0, utils_js_1.assert)(obj);
    (0, utils_js_1.assert)((0, utils_js_1.isObject)(obj));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(obj, 'baseServer', 'string'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(obj, 'baseAssets', 'string'));
    (0, utils_js_1.assert)((0, utils_js_1.isBaseServer)(obj.baseServer));
    (0, utils_js_1.assert)((0, utils_js_1.isBaseAssets)(obj.baseAssets));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(obj, 'includeAssetsImportedByServer', 'boolean'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(obj, 'redirects', 'object'));
    (0, utils_js_1.castType)(obj);
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(obj, 'trailingSlash', 'boolean'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(obj, 'disableUrlNormalization', 'boolean'));
    (0, utils_js_1.checkType)(obj);
}
exports.assertRuntimeManifest = assertRuntimeManifest;
