"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDistinguishable = exports.parse = exports.isValidPathAlias = exports.getNpmPackageImportPath = exports.getNpmPackageName = exports.isNpmPackageName = exports.isNpmPackageImport = void 0;
const assert_js_1 = require("./assert.js");
const assertIsNotBrowser_js_1 = require("./assertIsNotBrowser.js");
(0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
function isNpmPackageImport(str) {
    const res = parse(str);
    return res !== null;
}
exports.isNpmPackageImport = isNpmPackageImport;
function isNpmPackageName(str) {
    const res = parse(str);
    return res !== null && res.importPath === null;
}
exports.isNpmPackageName = isNpmPackageName;
function getNpmPackageName(str) {
    const res = parse(str);
    if (!res)
        return null;
    return res.pkgName;
}
exports.getNpmPackageName = getNpmPackageName;
function getNpmPackageImportPath(str) {
    const res = parse(str);
    if (!res)
        return null;
    return res.importPath;
}
exports.getNpmPackageImportPath = getNpmPackageImportPath;
function isValidPathAlias(alias) {
    // Cannot be distinguished from npm package names
    if (!isDistinguishable(alias))
        return false;
    // Ensure path alias starts with a special character.
    //  - In principle, we could allow path aliases that don't start with special character as long as they can be distinguished from npm package names.
    //    - But we still enforce path aliases to start with a special character because it's a much simpler rule to follow.
    if (alias.startsWith('@/'))
        return true; // Needed by contra.com
    const firstLetter = alias[0];
    (0, assert_js_1.assert)(firstLetter);
    if (firstLetter === '@' || /[0-9a-z]/.test(firstLetter.toLowerCase()))
        return false;
    return true;
}
exports.isValidPathAlias = isValidPathAlias;
function isDistinguishable(alias) {
    return (parse(alias) === null &&
        parse(`${alias}fake-path`) === null &&
        parse(`${alias}/fake-path`) === null &&
        parse(`${alias}fake/deep/path`) === null &&
        parse(`${alias}/fake/deep/path`) === null &&
        // See note about '-' in ./isNpmPackageName.spec.ts
        // ```ts
        // expect(parse('-')).toBe(null) // actually wrong: https://www.npmjs.com/package/-
        // ```
        !alias.startsWith('-'));
}
exports.isDistinguishable = isDistinguishable;
// The logic down below is wrong, for example:
//  - https://www.npmjs.com/package/-
// The correct logic is complex, see https://github.com/npm/validate-npm-package-name
// We don't need to be accurate: are there npm packages with weird names that are actually being used?
function parse(str) {
    if (!str)
        return null;
    let scope = null;
    if (str.startsWith('@')) {
        if (!str.includes('/'))
            return null;
        const [scope_, ...rest] = str.split('/');
        scope = scope_;
        str = rest.join('/');
        if (!str)
            return null;
        if (scope === '@' || invalid(scope.slice(1)))
            return null;
    }
    const [name, ...importPathParts] = str.split('/');
    if (!name || invalid(name))
        return null;
    const importPath = importPathParts.length === 0 ? null : importPathParts.join('/');
    return {
        pkgName: scope ? `${scope}/${name}` : name,
        importPath
    };
}
exports.parse = parse;
function invalid(s) {
    const firstLetter = s[0];
    if (!firstLetter || !/[a-z0-9]/.test(firstLetter))
        return true;
    if (/[^a-z0-9_\-\.]/.test(s))
        return true;
    return false;
}
