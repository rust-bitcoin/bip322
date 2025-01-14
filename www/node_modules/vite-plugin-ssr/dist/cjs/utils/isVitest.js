"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVitest = void 0;
function isVitest() {
    return typeof process !== 'undefined' && typeof process.env !== 'undefined' && 'VITEST' in process.env;
}
exports.isVitest = isVitest;
