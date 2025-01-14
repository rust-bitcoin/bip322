"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.raiseUnexpectedNode = raiseUnexpectedNode;
function raiseUnexpectedNode(nodeType, type) {
    /* istanbul ignore next */
    throw new Error(`Unexpected ${nodeType} "${type}" in Rollup's output chunk. Please open an issue at https://github.com/Menci/vite-plugin-top-level-await/issues.`);
}
