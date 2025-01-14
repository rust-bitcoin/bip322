"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorDebug = void 0;
const utils_js_1 = require("../utils.js");
function isErrorDebug() {
    return (0, utils_js_1.isDebugEnabled)('vps:error');
}
exports.isErrorDebug = isErrorDebug;
