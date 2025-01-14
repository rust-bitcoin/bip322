"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimWithAnsiTrailOnly = exports.trimWithAnsi = void 0;
const assert_js_1 = require("./assert.js");
const stripAnsi_js_1 = require("./stripAnsi.js");
const whitespaceRegex = /(\s+)/; // Capturing parathesis so that split preserves seperator
/* Same as trim() but works with ANSI escape codes */
function trimWithAnsi(str) {
    str = trimWithAnsiHead(str);
    str = trimWithAnsiTrailOnly(str);
    return str;
}
exports.trimWithAnsi = trimWithAnsi;
function trimWithAnsiHead(str) {
    return trim(str, false);
}
function trimWithAnsiTrailOnly(str) {
    return trim(str, true);
}
exports.trimWithAnsiTrailOnly = trimWithAnsiTrailOnly;
function trim(str, trail) {
    let parts = str.split(whitespaceRegex);
    if (trail)
        parts.reverse();
    let visible = false;
    parts = parts.map((line) => {
        if (visible)
            return line;
        const lineTrimmed = line.trim();
        const lineTrimmedAndStripped = (0, stripAnsi_js_1.stripAnsi)(lineTrimmed);
        (0, assert_js_1.assert)(lineTrimmedAndStripped.trim() === lineTrimmedAndStripped);
        if (lineTrimmedAndStripped !== '')
            visible = true;
        return lineTrimmed;
    });
    if (trail)
        parts.reverse();
    (0, assert_js_1.assert)(str.split(whitespaceRegex).join('') === str);
    const strTrimmed = parts.join('');
    return strTrimmed;
}
