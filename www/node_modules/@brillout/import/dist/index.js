"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.import_ = void 0;
exports.default = import_;
function import_(id) {
    id = fixWindowsBug(id);
    return import(/*webpackIgnore: true*/ id);
}
exports.import_ = import_;
// Avoid:
// ```
// Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only file and data URLs are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'd:'
// ```
// https://stackoverflow.com/questions/69665780/error-err-unsupported-esm-url-scheme-only-file-and-data-urls-are-supported-by/70057245#70057245
const prefix = 'file://';
function fixWindowsBug(id) {
    if (process.platform === 'win32' && isAbsolute(id) && !id.startsWith(prefix)) {
        return prefix + id;
    }
    else {
        return id;
    }
}
// Copied from https://github.com/unjs/pathe/blob/ae583c899ed9ebf44c94ab451da5fd7c3094dea9/src/path.ts#L14
// Alternative: https://github.com/nodejs/node/blob/49a77a5a996a49e8cb728eed42e55a7c1a9eef6e/lib/path.js#L402
// - Extracted version: https://github.com/brillout/import/commit/40bd11ce1e11e3b455c87a8cbca653fd10986021
function isAbsolute(path) {
    return /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/.test(path);
}
