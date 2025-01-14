export { trimWithAnsi };
export { trimWithAnsiTrailOnly };
import { assert } from './assert.js';
import { stripAnsi } from './stripAnsi.js';
const whitespaceRegex = /(\s+)/; // Capturing parathesis so that split preserves seperator
/* Same as trim() but works with ANSI escape codes */
function trimWithAnsi(str) {
    str = trimWithAnsiHead(str);
    str = trimWithAnsiTrailOnly(str);
    return str;
}
function trimWithAnsiHead(str) {
    return trim(str, false);
}
function trimWithAnsiTrailOnly(str) {
    return trim(str, true);
}
function trim(str, trail) {
    let parts = str.split(whitespaceRegex);
    if (trail)
        parts.reverse();
    let visible = false;
    parts = parts.map((line) => {
        if (visible)
            return line;
        const lineTrimmed = line.trim();
        const lineTrimmedAndStripped = stripAnsi(lineTrimmed);
        assert(lineTrimmedAndStripped.trim() === lineTrimmedAndStripped);
        if (lineTrimmedAndStripped !== '')
            visible = true;
        return lineTrimmed;
    });
    if (trail)
        parts.reverse();
    assert(str.split(whitespaceRegex).join('') === str);
    const strTrimmed = parts.join('');
    return strTrimmed;
}
