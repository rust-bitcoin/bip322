"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPromise = void 0;
const isCallable_js_1 = require("./isCallable.js");
function isPromise(val) {
    return typeof val === 'object' && val !== null && 'then' in val && (0, isCallable_js_1.isCallable)(val.then);
}
exports.isPromise = isPromise;
