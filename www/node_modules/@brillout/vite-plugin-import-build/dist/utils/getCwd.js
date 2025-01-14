"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCwd = void 0;
const filesystemPathHandling_1 = require("./filesystemPathHandling");
function getCwd() {
    if (typeof process == 'undefined' || !('cwd' in process))
        return null;
    return (0, filesystemPathHandling_1.toPosixPath)(process.cwd());
}
exports.getCwd = getCwd;
