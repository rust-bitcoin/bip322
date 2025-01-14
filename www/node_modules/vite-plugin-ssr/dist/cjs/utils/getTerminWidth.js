"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTerminalWidth = void 0;
function getTerminalWidth() {
    // https://stackoverflow.com/questions/30335637/get-width-of-terminal-in-node-js/30335724#30335724
    return ((typeof process !== 'undefined' && typeof process.stdout !== 'undefined' && process.stdout.columns) || undefined);
}
exports.getTerminalWidth = getTerminalWidth;
