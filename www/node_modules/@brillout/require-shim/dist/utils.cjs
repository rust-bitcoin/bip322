"use strict";
// Exact copy of https://github.com/brillout/vite-plugin-ssr/tree/2b59694ac4c3449d1ed857510cf70b0cc05f7ddf/vite-plugin-ssr/utils
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalObject = exports.isVitest = exports.pathJoin = exports.assertIsNotBrowser = exports.assert = exports.assertPosixPath = exports.toPosixPath = void 0;
function toPosixPath(path) {
    const pathPosix = path.split('\\').join('/');
    assertPosixPath(pathPosix);
    return pathPosix;
}
exports.toPosixPath = toPosixPath;
function assertPosixPath(path) {
    const errMsg = (msg) => `Not a posix path: ${msg}`;
    assert(path !== null, errMsg('null'));
    assert(typeof path === 'string', errMsg(`typeof path === '${typeof path}'`));
    assert(path !== '', errMsg('(empty string)'));
    assert(path);
    assert(!path.includes('\\'), errMsg(path));
}
exports.assertPosixPath = assertPosixPath;
function assert(condition, debugInfo) {
    if (condition)
        return;
    const githubRepository = 'https://github.com/brillout/require-shim';
    let errMsg = [
        '[@brillout/require-shim]',
        'You stumbled upon a bug.',
        `Go to ${githubRepository}/issues/new and copy-paste this error.`,
        'A maintainer will fix the bug.',
        debugInfo
    ]
        .filter(Boolean)
        .join(' ');
    throw new Error(errMsg);
}
exports.assert = assert;
function assertIsNotBrowser() {
    assert(!isBrowser());
}
exports.assertIsNotBrowser = assertIsNotBrowser;
function isBrowser() {
    // Using `typeof window !== 'undefined'` alone is not enough because some users use https://www.npmjs.com/package/ssr-window
    return typeof window !== 'undefined' && typeof window.scrollY === 'number';
}
function pathJoin(path1, path2) {
    assert(!path1.includes('\\'));
    assert(!path2.includes('\\'));
    let joined = [...path1.split('/'), ...path2.split('/')].filter(Boolean).join('/');
    if (path1.startsWith('/'))
        joined = '/' + joined;
    return joined;
}
exports.pathJoin = pathJoin;
function isVitest() {
    return typeof process !== 'undefined' && typeof process.env !== 'undefined' && 'VITEST' in process.env;
}
exports.isVitest = isVitest;
function getGlobalObject(
// We use the filename as key; each `getGlobalObject()` call should live in a unique filename.
key, defaultValue) {
    const allGlobalObjects = (globalThis.__brillout_require_shim = globalThis.__brillout_require_shim || {});
    const globalObject = (allGlobalObjects[key] = allGlobalObjects[key] || defaultValue);
    return globalObject;
}
exports.getGlobalObject = getGlobalObject;
