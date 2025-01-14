"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepEqual = void 0;
// https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects/32922084#32922084
function deepEqual(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty
        ? ok(x).length === ok(y).length && ok(x).every((key) => deepEqual(x[key], y[key]))
        : x === y;
}
exports.deepEqual = deepEqual;
