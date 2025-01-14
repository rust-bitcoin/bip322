export { getPropAccessNotation };
function getPropAccessNotation(key) {
    return isKeyDotNotationCompatible(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
}
function isKeyDotNotationCompatible(key) {
    return /^[a-z0-9\$_]+$/i.test(key);
}
