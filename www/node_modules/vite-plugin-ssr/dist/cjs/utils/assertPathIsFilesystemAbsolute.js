"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPathIsFilesystemAbsolute = void 0;
const path_1 = __importDefault(require("path"));
const assert_js_1 = require("./assert.js");
const filesystemPathHandling_js_1 = require("./filesystemPathHandling.js");
/** Assert path is absolute from the filesystem root */
function assertPathIsFilesystemAbsolute(p) {
    (0, filesystemPathHandling_js_1.assertPosixPath)(p);
    if (process.platform === 'win32') {
        (0, assert_js_1.assert)(path_1.default.win32.isAbsolute(p));
    }
    else {
        (0, assert_js_1.assert)(p.startsWith('/'));
    }
}
exports.assertPathIsFilesystemAbsolute = assertPathIsFilesystemAbsolute;
