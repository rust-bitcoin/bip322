"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEquivalentError = void 0;
const isObject_js_1 = require("./isObject.js");
const deepEqual_js_1 = require("./deepEqual.js");
function isEquivalentError(err1, err2) {
    return ((0, isObject_js_1.isObject)(err1) &&
        (0, isObject_js_1.isObject)(err2) &&
        err1.constructor === err2.constructor &&
        (0, deepEqual_js_1.deepEqual)({ ...err1, stack: null }, { ...err2, stack: null }) &&
        // 'message' and 'stack' are usually non-emurable
        err2.message === err2.message
    /* Doesn't work because: the stack trace isn't exactly the same between the original page rendering and the fallback error page rendering
    err2.stack === err2.stack
    */
    );
}
exports.isEquivalentError = isEquivalentError;
