"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectEntries = void 0;
// Same as `Object.entries()` but with type inference
function objectEntries(obj) {
    return Object.entries(obj);
}
exports.objectEntries = objectEntries;
