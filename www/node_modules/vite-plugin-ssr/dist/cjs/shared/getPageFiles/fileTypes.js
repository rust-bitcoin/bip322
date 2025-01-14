"use strict";
// TODO/v1-release: remove
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineFileType = exports.isValidFileType = exports.fileTypes = void 0;
const utils_js_1 = require("../utils.js");
const isScriptFile_js_1 = require("../../utils/isScriptFile.js");
const fileTypes = [
    '.page',
    '.page.server',
    '.page.route',
    '.page.client',
    // New type `.page.css`/`.page.server.css`/`.page.client.css` for `extensions[number].pageFileDist`.
    //  - Extensions using `pageFileDist` are expected to use a bundler that generates a `.css` colocated next to the original `.page.js` file (e.g. `/renderer/_default.page.server.css` for `/renderer/_default.page.server.js`.
    //  - Since these `.page.css` files Bundlers We can therefore expect that there isn't any `.page.server.sass`/...
    '.css'
];
exports.fileTypes = fileTypes;
function isValidFileType(filePath) {
    return ['.js', '.mjs', '.cjs', '.css'].some((ext) => filePath.endsWith(ext));
}
exports.isValidFileType = isValidFileType;
function determineFileType(filePath) {
    (0, utils_js_1.assertPosixPath)(filePath);
    {
        const isCSS = filePath.endsWith('.css');
        if (isCSS) {
            /* This assert() is skipped to reduce client-side bundle size
            assert(isNpmPackageImport(filePath), filePath) // `.css` page files are only supported for npm packages
            */
            return '.css';
        }
    }
    (0, utils_js_1.assert)((0, isScriptFile_js_1.isScriptFile)(filePath), filePath);
    const fileName = filePath.split('/').slice(-1)[0];
    const parts = fileName.split('.');
    const suffix1 = parts.slice(-3)[0];
    const suffix2 = parts.slice(-2)[0];
    if (suffix2 === 'page') {
        return '.page';
    }
    (0, utils_js_1.assert)(suffix1 === 'page', filePath);
    if (suffix2 === 'server') {
        return '.page.server';
    }
    if (suffix2 === 'client') {
        return '.page.client';
    }
    if (suffix2 === 'route') {
        return '.page.route';
    }
    (0, utils_js_1.assert)(false, filePath);
}
exports.determineFileType = determineFileType;
