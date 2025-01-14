"use strict";
// TODO/v1-release: remove
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPageFilePath = void 0;
const utils_js_1 = require("./utils.js");
function assertPageFilePath(filePath) {
    (0, utils_js_1.assertPosixPath)(filePath);
    /* This assert() is skipped to reduce client-side bundle size
    assert(filePath.startsWith('/') || isNpmPackageImport(filePath), { filePath })
    */
}
exports.assertPageFilePath = assertPageFilePath;
