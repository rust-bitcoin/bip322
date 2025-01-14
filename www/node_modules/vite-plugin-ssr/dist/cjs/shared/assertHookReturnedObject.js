"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertHookReturnedObject = void 0;
const utils_js_1 = require("./utils.js");
function assertHookReturnedObject(obj, keysExpected, errPrefix) {
    (0, utils_js_1.assert)(!errPrefix.endsWith(' '));
    const keysUnknown = [];
    const keys = Object.keys(obj);
    for (const key of keys) {
        if (!keysExpected.includes(key)) {
            keysUnknown.push(key);
        }
    }
    (0, utils_js_1.assertUsage)(keysUnknown.length === 0, [
        errPrefix,
        'returned an object with following unknown keys:',
        (0, utils_js_1.stringifyStringArray)(keysUnknown) + '.',
        'Only following keys are allowed:',
        (0, utils_js_1.stringifyStringArray)(keysExpected) + '.'
    ].join(' '));
}
exports.assertHookReturnedObject = assertHookReturnedObject;
