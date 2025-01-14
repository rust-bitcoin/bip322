"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilePathVite = exports.getFilePathAbsolute = void 0;
const filesystemPathHandling_js_1 = require("./filesystemPathHandling.js");
const assert_js_1 = require("./assert.js");
const path_1 = __importDefault(require("path"));
const assertIsNotProductionRuntime_js_1 = require("./assertIsNotProductionRuntime.js");
const isNpmPackage_js_1 = require("./isNpmPackage.js");
const assertPathIsFilesystemAbsolute_js_1 = require("./assertPathIsFilesystemAbsolute.js");
const module_1 = require("module");
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
(0, assertIsNotProductionRuntime_js_1.assertIsNotProductionRuntime)();
// Vite handles paths such as /pages/index.page.js which are relative to `config.root`.
// Make them absolute starting from the filesystem root.
// Also resolve plus files living in npm packages such as restack/renderer/+onRenderHtml.js
function getFilePathAbsolute(filePath, config) {
    (0, filesystemPathHandling_js_1.assertPosixPath)(filePath);
    if (filePath.startsWith('/@fs/')) {
        return filePath;
    }
    let filePathUnresolved;
    if ((0, isNpmPackage_js_1.isNpmPackageImport)(filePath)) {
        filePathUnresolved = filePath;
    }
    else {
        (0, assert_js_1.assert)(filePath.startsWith('/'));
        const { root } = config;
        (0, assertPathIsFilesystemAbsolute_js_1.assertPathIsFilesystemAbsolute)(root);
        filePathUnresolved = path_1.default.posix.join(root, filePath);
        (0, assertPathIsFilesystemAbsolute_js_1.assertPathIsFilesystemAbsolute)(filePathUnresolved);
    }
    let filePathAbsolute;
    try {
        filePathAbsolute = require_.resolve(filePathUnresolved, { paths: [config.root] });
    }
    catch (err) {
        console.error(err);
        (0, assert_js_1.assert)(false);
    }
    filePathAbsolute = (0, filesystemPathHandling_js_1.toPosixPath)(filePathAbsolute);
    (0, assertPathIsFilesystemAbsolute_js_1.assertPathIsFilesystemAbsolute)(filePathAbsolute);
    return filePathAbsolute;
}
exports.getFilePathAbsolute = getFilePathAbsolute;
function getFilePathVite(filePath, userRootDir, alwaysRelativeToRoot = false) {
    (0, filesystemPathHandling_js_1.assertPosixPath)(filePath);
    (0, filesystemPathHandling_js_1.assertPosixPath)(userRootDir);
    const filePathRelativeToRoot = path_1.default.posix.relative(userRootDir, filePath);
    if (!filePath.startsWith(userRootDir)) {
        if (alwaysRelativeToRoot) {
            return filePathRelativeToRoot;
        }
        else {
            return filePath;
        }
    }
    (0, assert_js_1.assert)(!filePathRelativeToRoot.startsWith('.') && !filePathRelativeToRoot.startsWith('/'));
    const filePathVite = `/${filePathRelativeToRoot}`;
    return filePathVite;
}
exports.getFilePathVite = getFilePathVite;
