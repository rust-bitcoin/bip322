"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPropertyGetter = void 0;
function hasPropertyGetter(obj, prop) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    return !!descriptor && !('value' in descriptor) && !!descriptor.get;
}
exports.hasPropertyGetter = hasPropertyGetter;
