"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExportNames = void 0;
const utils_js_1 = require("../../utils.js");
function getExportNames(p) {
    if (p.fileType === '.css') {
        return [];
    }
    if (p.exportNames) {
        return p.exportNames;
    }
    (0, utils_js_1.assert)(p.fileExports, p.filePath);
    const exportNames = Object.keys(p.fileExports);
    return exportNames;
}
exports.getExportNames = getExportNames;
