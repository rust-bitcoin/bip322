"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeCumulativeValues = void 0;
const assert_js_1 = require("./assert.js");
function mergeCumulativeValues(values) {
    if (values.length === 0)
        return null;
    if (values.every((v) => v instanceof Set)) {
        return new Set(values
            .map((v) => {
            (0, assert_js_1.assert)(v instanceof Set);
            return [...v];
        })
            .flat());
    }
    if (values.every((v) => Array.isArray(v))) {
        return values.flat();
    }
    return null;
}
exports.mergeCumulativeValues = mergeCumulativeValues;
