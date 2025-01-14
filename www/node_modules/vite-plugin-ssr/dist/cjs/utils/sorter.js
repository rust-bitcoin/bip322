"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLast = exports.makeFirst = exports.lowerFirst = exports.higherFirst = void 0;
const assert_js_1 = require("./assert.js");
// -1 => element1 first (i.e. `indexOf(element1) < indexOf(element2)`)
// +1 => element2 first (i.e. `indexOf(element2) < indexOf(element1)`)
// 0 => keep original order of element1 and element2
function higherFirst(getValue) {
    return (element1, element2) => {
        const val1 = getValue(element1);
        const val2 = getValue(element2);
        if (val1 === val2) {
            return 0;
        }
        return val1 > val2 ? -1 : 1;
    };
}
exports.higherFirst = higherFirst;
function lowerFirst(getValue) {
    return (element1, element2) => {
        const val1 = getValue(element1);
        const val2 = getValue(element2);
        if (val1 === val2) {
            return 0;
        }
        return val1 < val2 ? -1 : 1;
    };
}
exports.lowerFirst = lowerFirst;
function makeFirst(getValue) {
    return (element1, element2) => {
        const val1 = getValue(element1);
        const val2 = getValue(element2);
        (0, assert_js_1.assert)([true, false, null].includes(val1));
        (0, assert_js_1.assert)([true, false, null].includes(val2));
        if (val1 === val2) {
            return 0;
        }
        if (val1 === true || val2 === false) {
            return -1;
        }
        if (val2 === true || val1 === false) {
            return 1;
        }
        (0, assert_js_1.assert)(false);
    };
}
exports.makeFirst = makeFirst;
function makeLast(getValue) {
    return makeFirst((element) => {
        const val = getValue(element);
        if (val === null) {
            return null;
        }
        else {
            return !val;
        }
    });
}
exports.makeLast = makeLast;
