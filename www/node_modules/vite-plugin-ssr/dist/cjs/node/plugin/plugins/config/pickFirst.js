"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickFirst = void 0;
function pickFirst(arr) {
    return arr.filter((v) => v !== undefined)[0];
}
exports.pickFirst = pickFirst;
