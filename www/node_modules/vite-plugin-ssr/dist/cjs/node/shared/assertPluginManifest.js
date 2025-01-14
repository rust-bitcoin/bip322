"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPluginManifest = void 0;
const assertRuntimeManifest_js_1 = require("./assertRuntimeManifest.js");
const utils_js_1 = require("./utils.js");
function assertPluginManifest(pluginManifest) {
    (0, utils_js_1.assert)((0, utils_js_1.isPlainObject)(pluginManifest));
    (0, utils_js_1.assertUsage)(pluginManifest.version === utils_js_1.projectInfo.projectVersion, `Re-build your app (you're using vite-plugin-ssr@${utils_js_1.projectInfo.projectVersion} but your app was built with vite-plugin-ssr@${pluginManifest.version})`);
    (0, assertRuntimeManifest_js_1.assertRuntimeManifest)(pluginManifest);
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pluginManifest, 'usesClientRouter', 'boolean'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pluginManifest, 'version', 'string'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pluginManifest, 'manifestKeyMap', 'object'));
    const { manifestKeyMap } = pluginManifest;
    (0, utils_js_1.assert)((0, utils_js_1.isStringRecord)(manifestKeyMap));
    // Avoid:
    // ```
    // Uncaught (in promise) TypeError: Cannot set property manifestKeyMap of #<Object> which has only a getter
    // ```
    // See https://github.com/brillout/vite-plugin-ssr/issues/596
    const pluginManifestClone = { ...pluginManifest };
    (0, utils_js_1.objectAssign)(pluginManifestClone, { manifestKeyMap });
    (0, utils_js_1.checkType)(pluginManifestClone);
}
exports.assertPluginManifest = assertPluginManifest;
