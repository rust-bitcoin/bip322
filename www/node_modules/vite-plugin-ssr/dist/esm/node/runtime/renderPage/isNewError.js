export { isNewError };
export { setAlreadyLogged };
import { getGlobalObject, isObject, isEquivalentError, warnIfErrorIsNotObject } from '../utils.js';
const globalObject = getGlobalObject('runtime/renderPage/isNewError.ts', {
    wasAlreadyLogged: new WeakSet()
});
function isNewError(errErrorPage, errNominalPage) {
    warnIfErrorIsNotObject(errErrorPage);
    return !isEquivalentError(errNominalPage, errErrorPage) || !hasAlreadyLogged(errNominalPage);
}
function hasAlreadyLogged(err) {
    if (!isObject(err))
        return false;
    return globalObject.wasAlreadyLogged.has(err);
}
function setAlreadyLogged(err) {
    if (!isObject(err))
        return;
    globalObject.wasAlreadyLogged.add(err);
}
