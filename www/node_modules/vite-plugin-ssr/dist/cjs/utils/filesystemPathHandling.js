"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPosixPath = exports.toPosixPath = void 0;
const assert_js_1 = require("./assert.js");
function toPosixPath(path) {
    const pathPosix = path.split('\\').join('/');
    assertPosixPath(pathPosix);
    return pathPosix;
}
exports.toPosixPath = toPosixPath;
function assertPosixPath(path) {
    const errMsg = (msg) => `Not a posix path: ${msg}`;
    (0, assert_js_1.assert)(path !== null, errMsg('null'));
    (0, assert_js_1.assert)(typeof path === 'string', errMsg(`typeof path === ${JSON.stringify(typeof path)}`));
    (0, assert_js_1.assert)(path !== '', errMsg('(empty string)'));
    (0, assert_js_1.assert)(path);
    (0, assert_js_1.assert)(!path.includes('\\'), errMsg(path));
}
exports.assertPosixPath = assertPosixPath;
