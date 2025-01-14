"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSuperfluousViteLog_disable = exports.removeSuperfluousViteLog_enable = exports.removeSuperfluousViteLog = void 0;
const utils_js_1 = require("../../utils.js");
const superfluousLog = 'Forced re-optimization of dependencies';
let enabled = false;
function removeSuperfluousViteLog(msg) {
    if (!enabled) {
        return false;
    }
    if (msg.toLowerCase().includes('forced') && msg.toLowerCase().includes('optimization')) {
        (0, utils_js_1.assert)(msg === superfluousLog, msg); // assertion fails => Vite changed its message => update this function
        return true;
    }
    return false;
}
exports.removeSuperfluousViteLog = removeSuperfluousViteLog;
function removeSuperfluousViteLog_enable() {
    enabled = true;
}
exports.removeSuperfluousViteLog_enable = removeSuperfluousViteLog_enable;
function removeSuperfluousViteLog_disable() {
    enabled = false;
}
exports.removeSuperfluousViteLog_disable = removeSuperfluousViteLog_disable;
