"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determinePageIdOld = void 0;
const utils_js_1 = require("./utils.js");
// TODO/v1-release: remove
function determinePageIdOld(filePath) {
    const pageSuffix = '.page.';
    const pageId = (0, utils_js_1.slice)(filePath.split(pageSuffix), 0, -1).join(pageSuffix);
    (0, utils_js_1.assert)(!pageId.includes('\\'));
    return pageId;
}
exports.determinePageIdOld = determinePageIdOld;
