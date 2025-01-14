export { objectAssign };
// Same as Object.assign() but:
//  - With type inference
//  - Preserves property descriptors, which we need for preserving the getters added by addUrlComputedProps()
function objectAssign(obj, objAddendum) {
    Object.defineProperties(obj, Object.getOwnPropertyDescriptors(objAddendum));
}
