"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFileExtention = void 0;
function removeFileExtention(filePath) {
    return filePath.split('.').slice(0, -1).join('.');
}
exports.removeFileExtention = removeFileExtention;
