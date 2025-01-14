"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPageConfig = void 0;
const utils_js_1 = require("../utils.js");
function findPageConfig(pageConfigs, pageId) {
    const result = pageConfigs.filter((p) => p.pageId === pageId);
    (0, utils_js_1.assert)(result.length <= 1);
    const pageConfig = result[0] ?? null;
    return pageConfig;
}
exports.findPageConfig = findPageConfig;
