"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectAssign = void 0;
// Same as Object.assign() but:
//  - With type inference
//  - Preserves property descriptors, which we need for preserving the getters added by addUrlComputedProps()
function objectAssign(obj, objAddendum) {
    Object.defineProperties(obj, Object.getOwnPropertyDescriptors(objAddendum));
}
exports.objectAssign = objectAssign;
