"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileExtension = void 0;
const slice_js_1 = require("./slice.js");
function getFileExtension(id) {
    id = id.split('?')[0];
    const fileName = (0, slice_js_1.slice)(id.split('/'), -1, 0)[0];
    if (!fileName) {
        return null;
    }
    const fileExtension = (0, slice_js_1.slice)(fileName.split('.'), -1, 0)[0];
    if (!fileExtension) {
        return null;
    }
    return fileExtension;
}
exports.getFileExtension = getFileExtension;
