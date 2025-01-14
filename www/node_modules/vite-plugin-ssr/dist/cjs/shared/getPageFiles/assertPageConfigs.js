"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPageConfigGlobal = exports.assertPageConfigs = void 0;
const utils_js_1 = require("../utils.js");
function assertPageConfigs(pageConfigs) {
    (0, utils_js_1.assert)(Array.isArray(pageConfigs));
    pageConfigs.forEach((pageConfig) => {
        (0, utils_js_1.assert)((0, utils_js_1.isObject)(pageConfig));
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageConfig, 'pageId', 'string'));
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageConfig, 'routeFilesystem'));
    });
}
exports.assertPageConfigs = assertPageConfigs;
function assertPageConfigGlobal(pageConfigGlobal) {
    (0, utils_js_1.assert)(pageConfigGlobal);
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageConfigGlobal, 'onBeforeRoute'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageConfigGlobal, 'onPrerenderStart'));
}
exports.assertPageConfigGlobal = assertPageConfigGlobal;
