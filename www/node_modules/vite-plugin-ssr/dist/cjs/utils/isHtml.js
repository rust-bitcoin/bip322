"use strict";
// Unit tests at ./isHtml.spec.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHtml = void 0;
function isHtml(str) {
    // Copied and adapted from https://stackoverflow.com/questions/15458876/check-if-a-string-is-html-or-not/51325984#51325984
    const re = /(<\/[^<]+>)|(<[^<]+\/>)/;
    return re.test(str);
}
exports.isHtml = isHtml;
