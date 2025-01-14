"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPropAccessNotation = void 0;
function getPropAccessNotation(key) {
    return isKeyDotNotationCompatible(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
}
exports.getPropAccessNotation = getPropAccessNotation;
function isKeyDotNotationCompatible(key) {
    return /^[a-z0-9\$_]+$/i.test(key);
}
