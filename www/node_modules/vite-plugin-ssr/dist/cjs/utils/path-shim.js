"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathJoin = void 0;
// Simple shim for `import * from "node:path"` used by the server runtime.
// Robust alternative: https://github.com/unjs/pathe
const assert_js_1 = require("./assert.js");
function pathJoin(path1, path2) {
    (0, assert_js_1.assert)(!path1.includes('\\'));
    (0, assert_js_1.assert)(!path2.includes('\\'));
    let joined = [...path1.split('/'), ...path2.split('/')].filter(Boolean).join('/');
    if (path1.startsWith('/'))
        joined = '/' + joined;
    return joined;
}
exports.pathJoin = pathJoin;
