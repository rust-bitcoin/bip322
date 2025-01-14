"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSystemPath = exports.assertPosixPath = exports.toPosixPath = void 0;
const assert_1 = require("./assert");
const sepPosix = '/';
const sepWin32 = '\\';
function toPosixPath(path) {
    if (isPosix()) {
        assertPosixPath(path);
        return path;
    }
    if (isWin32()) {
        const pathPosix = path.split(sepWin32).join(sepPosix);
        assertPosixPath(pathPosix);
        return pathPosix;
    }
    (0, assert_1.assert)(false);
}
exports.toPosixPath = toPosixPath;
function assertPosixPath(path) {
    (0, assert_1.assert)(path && !path.includes(sepWin32), `Wrongly formatted path: ${path}`);
}
exports.assertPosixPath = assertPosixPath;
function toSystemPath(path) {
    if (isPosix()) {
        return toPosixPath(path);
    }
    if (isWin32()) {
        return path.split(sepPosix).join(sepWin32);
    }
    (0, assert_1.assert)(false);
}
exports.toSystemPath = toSystemPath;
function isWin32() {
    return process.platform === 'win32';
}
function isPosix() {
    return !isWin32();
}
