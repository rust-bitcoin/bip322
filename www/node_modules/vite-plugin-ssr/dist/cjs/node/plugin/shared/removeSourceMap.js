"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSourceMap = void 0;
function removeSourceMap(code) {
    return {
        code,
        // Remove Source Map to save KBs
        //  - https://rollupjs.org/guide/en/#source-code-transformations
        map: { mappings: '' }
    };
}
exports.removeSourceMap = removeSourceMap;
