"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeEmptyLines = void 0;
function removeEmptyLines(msg) {
    return msg
        .split('\n')
        .filter((line) => line.trim() !== '')
        .join('\n');
}
exports.removeEmptyLines = removeEmptyLines;
