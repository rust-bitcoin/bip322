"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupIsEsm = void 0;
const utils_js_1 = require("../utils.js");
function rollupIsEsm(rollupOptions) {
    const { format } = rollupOptions;
    (0, utils_js_1.assert)(typeof format === 'string');
    (0, utils_js_1.assert)(format === 'amd' ||
        format === 'cjs' ||
        format === 'es' ||
        format === 'iife' ||
        format === 'system' ||
        format === 'umd');
    return format === 'es';
}
exports.rollupIsEsm = rollupIsEsm;
