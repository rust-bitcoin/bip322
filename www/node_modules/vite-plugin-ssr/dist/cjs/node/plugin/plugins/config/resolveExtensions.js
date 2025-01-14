"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveExtensions = void 0;
const utils_js_1 = require("../../utils.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fileTypes_js_1 = require("../../../../shared/getPageFiles/fileTypes.js");
const module_1 = require("module");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
function resolveExtensions(configs, config) {
    const extensions = configs.map((c) => c.extensions ?? []).flat();
    return extensions.map((extension) => {
        const { npmPackageName } = extension;
        (0, utils_js_1.assertUsage)((0, utils_js_1.isNpmPackageName)(npmPackageName), `vite-plugin-ssr extension ${picocolors_1.default.cyan(npmPackageName)} doesn't seem to be a valid npm package name`);
        const npmPackageRootDir = (0, utils_js_1.getDependencyRootDir)(npmPackageName, config.root);
        (0, utils_js_1.assertPosixPath)(npmPackageRootDir);
        const pageConfigsDistFiles = resolvePageFilesDist([
            ...(extension.pageConfigsDistFiles ?? []),
            // TODO/v1-release: remove
            ...(extension.pageFilesDist ?? [])
        ], npmPackageName, config, npmPackageRootDir);
        let pageConfigsSrcDirResolved = null;
        {
            const pageConfigsSrcDir = extension.pageConfigsSrcDir ?? extension.pageFilesSrc;
            if (pageConfigsSrcDir) {
                assertPathProvidedByUser('pageConfigsSrcDir', pageConfigsSrcDir, true);
                (0, utils_js_1.assert)(pageConfigsSrcDir.endsWith('*'));
                pageConfigsSrcDirResolved = path_1.default.posix.join(npmPackageRootDir, pageConfigsSrcDir.slice(0, -1));
            }
        }
        (0, utils_js_1.assertUsage)(pageConfigsSrcDirResolved || pageConfigsDistFiles, `Extension ${npmPackageName} should define either extension[number].pageConfigsDistFiles or extension[number].pageConfigsSrcDir`);
        (0, utils_js_1.assertUsage)(!pageConfigsDistFiles || !pageConfigsSrcDirResolved, `Extension ${npmPackageName} shouldn't define extension[number].pageConfigsDistFiles as well extension[number].pageConfigsSrcDir, it should define only one instead`);
        const assetsDir = (() => {
            if (!extension.assetsDir) {
                return null;
            }
            assertPathProvidedByUser('assetsDir', extension.assetsDir);
            (0, utils_js_1.assertPosixPath)(extension.assetsDir);
            const assetsDir = path_1.default.posix.join(npmPackageRootDir, extension.assetsDir);
            return assetsDir;
        })();
        (0, utils_js_1.assertUsage)(!(assetsDir && pageConfigsSrcDirResolved), `Extension ${npmPackageName} shouldn't define both extension[number].pageConfigsSrcDir and extension[number].assetsDir`);
        const extensionResolved = {
            npmPackageName,
            npmPackageRootDir,
            pageConfigsDistFiles,
            pageConfigsSrcDir: pageConfigsSrcDirResolved,
            assetsDir
        };
        return extensionResolved;
    });
}
exports.resolveExtensions = resolveExtensions;
function assertPathProvidedByUser(pathName, pathValue, starSuffix) {
    const errMsg = `extension[number].${pathName} value ${picocolors_1.default.cyan(pathValue)}`;
    (0, utils_js_1.assertUsage)(!pathValue.includes('\\'), `${errMsg} shouldn't contain any backward slahes '\' (replace them with forward slahes '/')`);
    (0, utils_js_1.assertUsage)(!starSuffix || pathValue.endsWith('/*'), `${errMsg} should end with '/*'`);
    (0, utils_js_1.assertUsage)(pathValue.startsWith('/'), `${errMsg} should start with '/'`);
}
function resolvePageFilesDist(pageConfigsDistFiles, npmPackageName, config, npmPackageRootDir) {
    if (!pageConfigsDistFiles || pageConfigsDistFiles.length === 0)
        return null;
    const pageConfigsDistFilesResolved = [];
    pageConfigsDistFiles.forEach((importPath) => {
        const errPrefix = `The page file ${picocolors_1.default.cyan(importPath)} (provided in extensions[number].pageFiles) should`;
        (0, utils_js_1.assertUsage)(npmPackageName === (0, utils_js_1.getNpmPackageName)(importPath), `${errPrefix} be a ${picocolors_1.default.cyan(npmPackageName)} module (e.g. ${picocolors_1.default.cyan(`${npmPackageName}/renderer/_default.page.server.js`)})`);
        (0, utils_js_1.assertUsage)((0, fileTypes_js_1.isValidFileType)(importPath), `${errPrefix} end with '.js', '.js', '.cjs', or '.css'`);
        const filePath = resolveImportPath(importPath, npmPackageName, config, npmPackageRootDir);
        pageConfigsDistFilesResolved.push({
            importPath,
            filePath
        });
        const filePathCSS = getPathCSS(filePath);
        if (filePathCSS !== filePath && fs_1.default.existsSync(filePathCSS)) {
            const importPathCSS = getPathCSS(importPath);
            (0, utils_js_1.assertUsage)(filePathCSS === resolveImportPath(importPathCSS, npmPackageName, config, npmPackageRootDir), `The entry package.json#exports["${importPathCSS}"] in the package.json of ${npmPackageName} (${npmPackageRootDir}/package.json) has a wrong value: make sure it resolves to ${filePathCSS}`);
            pageConfigsDistFilesResolved.push({
                importPath: importPathCSS,
                filePath: filePathCSS
            });
        }
    });
    return pageConfigsDistFilesResolved;
}
function resolveImportPath(importPath, npmPackageName, config, npmPackageRootDir) {
    let filePath;
    try {
        filePath = require_.resolve(importPath, { paths: [config.root] });
    }
    catch (err) {
        if (err?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
            (0, utils_js_1.assertUsage)(false, `Define ${importPath} in the package.json#exports of ${npmPackageName} (${npmPackageRootDir}/package.json) with a Node.js export condition (even if it's a browser file such as CSS)`);
        }
        throw err;
    }
    filePath = (0, utils_js_1.toPosixPath)(filePath);
    return filePath;
}
function getPathCSS(filePath) {
    return filePath.split('.').slice(0, -1).join('.') + '.css';
}
