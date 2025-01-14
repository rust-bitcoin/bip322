"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeRegex = void 0;
function escapeRegex(str) {
    // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
    return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}
exports.escapeRegex = escapeRegex;
