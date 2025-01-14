"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFileExtensionsToRequireResolve = void 0;
const assert_js_1 = require("./assert.js");
const isScriptFile_js_1 = require("./isScriptFile.js");
function addFileExtensionsToRequireResolve() {
    const added = [];
    isScriptFile_js_1.scriptFileExtensionList.forEach((ext) => {
        (0, assert_js_1.assert)(!ext.includes('.'));
        ext = `.${ext}`;
        if (!require.extensions[ext]) {
            require.extensions[ext] = require.extensions['.js'];
            added.push(ext);
        }
    });
    const clean = () => {
        added.forEach((ext) => {
            delete require.extensions[ext];
        });
    };
    return clean;
}
exports.addFileExtensionsToRequireResolve = addFileExtensionsToRequireResolve;
