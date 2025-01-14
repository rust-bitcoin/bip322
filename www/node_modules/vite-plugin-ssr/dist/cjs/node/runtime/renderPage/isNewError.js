"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAlreadyLogged = exports.isNewError = void 0;
const utils_js_1 = require("../utils.js");
const globalObject = (0, utils_js_1.getGlobalObject)('runtime/renderPage/isNewError.ts', {
    wasAlreadyLogged: new WeakSet()
});
function isNewError(errErrorPage, errNominalPage) {
    (0, utils_js_1.warnIfErrorIsNotObject)(errErrorPage);
    return !(0, utils_js_1.isEquivalentError)(errNominalPage, errErrorPage) || !hasAlreadyLogged(errNominalPage);
}
exports.isNewError = isNewError;
function hasAlreadyLogged(err) {
    if (!(0, utils_js_1.isObject)(err))
        return false;
    return globalObject.wasAlreadyLogged.has(err);
}
function setAlreadyLogged(err) {
    if (!(0, utils_js_1.isObject)(err))
        return;
    globalObject.wasAlreadyLogged.add(err);
}
exports.setAlreadyLogged = setAlreadyLogged;
