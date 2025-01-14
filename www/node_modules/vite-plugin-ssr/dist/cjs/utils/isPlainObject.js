"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlainObject = void 0;
function isPlainObject(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    // Support `Object.create(null)`
    if (Object.getPrototypeOf(value) === null) {
        return true;
    }
    return (
    /* Doesn't work in Cloudlfare Pages workers
    value.constructor === Object
    */
    value.constructor.name === 'Object');
}
exports.isPlainObject = isPlainObject;
