"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinEnglish = void 0;
const assert_js_1 = require("./assert.js");
// https://stackoverflow.com/questions/53879088/join-an-array-by-commas-and-and/53879103#53879103
function joinEnglish(arr, conjunction) {
    (0, assert_js_1.assert)(arr.length > 0);
    if (arr.length === 1)
        return arr[0];
    const firsts = arr.slice(0, arr.length - 1);
    const last = arr[arr.length - 1];
    return firsts.join(', ') + ` ${conjunction} ` + last;
}
exports.joinEnglish = joinEnglish;
