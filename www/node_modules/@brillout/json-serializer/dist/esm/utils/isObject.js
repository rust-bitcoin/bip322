export { isObject };
function isObject(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    if (Array.isArray(value)) {
        return false;
    }
    return true;
}
