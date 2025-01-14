"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
function sleep(milliseconds) {
    return new Promise((r) => setTimeout(r, milliseconds));
}
exports.sleep = sleep;
