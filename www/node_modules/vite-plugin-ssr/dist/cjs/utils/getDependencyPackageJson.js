"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDependencyRootDir = exports.getDependencyPackageJsonPath = exports.getDependencyPackageJson = void 0;
// There doesn't seem to be any alternative:
//  - https://github.com/antfu/local-pkg
//  - https://stackoverflow.com/questions/74640378/find-and-read-package-json-of-a-dependency
//  - https://stackoverflow.com/questions/58442451/finding-the-root-directory-of-a-dependency-in-npm
//  - https://stackoverflow.com/questions/10111163/how-can-i-get-the-path-of-a-module-i-have-loaded-via-require-that-is-not-mine/63441056#63441056
const assert_js_1 = require("./assert.js");
const isNpmPackage_js_1 = require("./isNpmPackage.js");
const filesystemPathHandling_js_1 = require("./filesystemPathHandling.js");
const isObject_js_1 = require("./isObject.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const assertIsNotProductionRuntime_js_1 = require("./assertIsNotProductionRuntime.js");
const module_1 = require("module");
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
(0, assertIsNotProductionRuntime_js_1.assertIsNotProductionRuntime)();
function getDependencyPackageJson(npmPackageName, userAppRootDir) {
    const packageJsonPath = getDependencyPackageJsonPath(npmPackageName, userAppRootDir);
    const packageJson = fs_1.default.readFileSync(packageJsonPath, 'utf8');
    (0, assert_js_1.assert)((0, isObject_js_1.isObject)(packageJson));
    return packageJson;
}
exports.getDependencyPackageJson = getDependencyPackageJson;
function getDependencyRootDir(npmPackageName, userAppRootDir) {
    const rootDir = path_1.default.posix.dirname(getDependencyPackageJsonPath(npmPackageName, userAppRootDir));
    return rootDir;
}
exports.getDependencyRootDir = getDependencyRootDir;
function getDependencyPackageJsonPath(npmPackageName, userAppRootDir) {
    (0, assert_js_1.assert)((0, isNpmPackage_js_1.isNpmPackageName)(npmPackageName));
    let packageJsonPath = resolvePackageJsonDirectly(npmPackageName, userAppRootDir);
    if (!packageJsonPath) {
        packageJsonPath = resolvePackageJsonWithMainEntry(npmPackageName, userAppRootDir);
    }
    (0, assert_js_1.assertUsage)(packageJsonPath, `Cannot read ${npmPackageName}/package.json. Define package.json#exports["./package.json"] with the value "./package.json" in the package.json of ${npmPackageName}.`);
    packageJsonPath = (0, filesystemPathHandling_js_1.toPosixPath)(packageJsonPath);
    (0, assert_js_1.assert)(packageJsonPath.endsWith('/package.json'), packageJsonPath); // package.json#exports["package.json"] may point to another file than package.json
    return packageJsonPath;
}
exports.getDependencyPackageJsonPath = getDependencyPackageJsonPath;
function resolvePackageJsonDirectly(npmPackageName, userAppRootDir) {
    let packageJsonPath;
    try {
        packageJsonPath = require_.resolve(`${npmPackageName}/package.json`, { paths: [userAppRootDir] });
    }
    catch (err) {
        if (isUnexpectedError(err))
            throw err;
        return null;
    }
    return packageJsonPath;
}
function resolvePackageJsonWithMainEntry(npmPackageName, userAppRootDir) {
    let mainEntry;
    try {
        mainEntry = require_.resolve(npmPackageName, { paths: [userAppRootDir] });
    }
    catch (err) {
        if (isUnexpectedError(err))
            throw err;
        return null;
    }
    const packageJsonPath = searchPackageJSON(mainEntry);
    return packageJsonPath;
}
// If the npm package doesn't define package.json#exports then require.resolve(`${npmPackageName}/package.json`) just works.
// This means we can assume packageJson#exports to be defined and, consequently, we can assume the error code to always be ERR_PACKAGE_PATH_NOT_EXPORTED.
// (If MODULE_NOT_FOUND is thrown then this means that npmPackageName isn't installed.)
function isUnexpectedError(err) {
    return err?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED';
}
// Copied and adapted from https://github.com/antfu/local-pkg
function searchPackageJSON(dir) {
    let packageJsonPath;
    while (true) {
        (0, assert_js_1.assert)(dir);
        const newDir = path_1.default.dirname(dir);
        (0, assert_js_1.assert)(newDir !== dir);
        dir = newDir;
        packageJsonPath = path_1.default.join(dir, 'package.json');
        if (fs_1.default.existsSync(packageJsonPath))
            return packageJsonPath;
    }
}
