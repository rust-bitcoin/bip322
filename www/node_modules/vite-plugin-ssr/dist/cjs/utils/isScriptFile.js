"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptFileExtensionList = exports.scriptFileExtensions = exports.isTemplateFile = exports.isScriptFile = void 0;
const assert_js_1 = require("./assert.js");
// We can't use a RegExp:
//  - Needs to work with Micromatch: https://github.com/micromatch/micromatch because:
//    - Vite's `import.meta.glob()` uses Micromatch
//  - We need this to be a whitelist because:
//   - A pattern `*([a-zA-Z0-9]` doesn't work.
//     - Because of ReScript: `.res` are ReScript source files which need to be ignored. (The ReScript compiler generates `.js` files alongside `.res` files.)
//   - Black listing doesn't work.
//     - We cannot implement a blacklist with a glob pattern.
//     - A post `import.meta.glob()` blacklist filtering doesn't work because Vite would still process the files (e.g. including them in the bundle).
// prettier-ignore
const extJavaScript = [
    'js',
    'ts',
    'cjs',
    'cts',
    'mjs',
    'mts',
    'jsx',
    'tsx',
    'cjsx',
    'ctsx',
    'mjsx',
    'mtsx',
];
// prettier-ignore
const extTemplates = [
    'vue',
    'svelte',
    'marko',
    'md',
    'mdx'
];
const scriptFileExtensionList = [...extJavaScript, ...extTemplates];
exports.scriptFileExtensionList = scriptFileExtensionList;
const scriptFileExtensions = '(' + scriptFileExtensionList.join('|') + ')';
exports.scriptFileExtensions = scriptFileExtensions;
function isScriptFile(filePath) {
    const yes = scriptFileExtensionList.some((ext) => filePath.endsWith('.' + ext));
    (0, assert_js_1.assert)(!isJavaScriptFile(filePath) || yes);
    return yes;
}
exports.isScriptFile = isScriptFile;
function isJavaScriptFile(filePath) {
    return /\.(c|m)?(j|t)sx?$/.test(filePath);
}
function isTemplateFile(filePath) {
    return extTemplates.some((ext) => filePath.endsWith('.' + ext));
}
exports.isTemplateFile = isTemplateFile;
