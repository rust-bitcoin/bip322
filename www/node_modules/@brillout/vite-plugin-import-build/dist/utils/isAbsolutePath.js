"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAbsolutePath = void 0;
const path_1 = __importDefault(require("path"));
const filesystemPathHandling_1 = require("./filesystemPathHandling");
// Workaround for:
// ```
// const p = 'E:/Projects/vite-ssr-test/dist/server'
// assertPosixPath(p)
// assert(path.posix.isAbsolute(p)===false)
// assert(path.win32.isAbsolute(p)===true)
// ```
function isAbsolutePath(p) {
    (0, filesystemPathHandling_1.assertPosixPath)(p);
    if (process.platform === 'win32') {
        return path_1.default.win32.isAbsolute(p);
    }
    else {
        return path_1.default.posix.isAbsolute(p);
    }
}
exports.isAbsolutePath = isAbsolutePath;
