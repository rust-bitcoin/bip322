"use strict";
// Move to standalone package? E.g. https://www.npmjs.com/package/stem
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStemPackages = void 0;
const path_1 = __importDefault(require("path"));
const utils_js_1 = require("../../utils.js");
const import_1 = require("@brillout/import");
const module_1 = require("module");
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
async function getStemPackages(userAppRootDir) {
    const userRootDir = findUserRootDir(userAppRootDir);
    const userPkgJson = getUserPackageJson(userRootDir);
    const stemPkgNames = getStemPkgNames(userPkgJson);
    const stemPackages = await Promise.all(stemPkgNames.map((stemPackageName) => {
        (0, utils_js_1.assert)(stemPackageName.includes('stem-'));
        const resolveModulePath = (moduleId) => {
            const importPath = `${stemPackageName}/${moduleId}`;
            try {
                const modulePath = require_.resolve(importPath, { paths: [userRootDir] });
                return modulePath;
            }
            catch (err) {
                // - ERR_PACKAGE_PATH_NOT_EXPORTED => package.json#exports[importPath] is missing
                // - We assert that Stem packages always define package.json#exports down below
                if (err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
                    return null;
                }
                // All other errors such as ERR_MODULE_NOT_FOUND should be thrown
                throw err;
            }
        };
        const loadModule = async (moduleId) => {
            const modulePath = resolveModulePath(moduleId);
            if (modulePath === null)
                return null;
            const moduleExports = moduleId.endsWith('.json')
                ? require_(modulePath)
                : await (0, import_1.import_)(modulePath);
            return moduleExports;
        };
        const stemPackageRootDir = (0, utils_js_1.getDependencyRootDir)(stemPackageName, userAppRootDir);
        return {
            stemPackageName,
            stemPackageRootDir,
            loadModule
        };
    }));
    return stemPackages;
}
exports.getStemPackages = getStemPackages;
function findUserRootDir(userAppRootDir) {
    const userPkgJsonPath = (0, utils_js_1.findUserPackageJsonPath)(userAppRootDir);
    (0, utils_js_1.assertUsage)(userPkgJsonPath, `Couldn't find package.json in any parent directory starting from ${userAppRootDir}`);
    return (0, utils_js_1.toPosixPath)(path_1.default.dirname(userPkgJsonPath));
}
function getStemPkgNames(userPkgJson) {
    const stemPkgNames = Object.keys(userPkgJson.dependencies ?? {}).filter((depName) => {
        if (depName.startsWith('stem-')) {
            (0, utils_js_1.assertWarning)(false, `${depName} should be renamed to @someNpmOrgOrUser/${depName} (to follow the convention that all Stem packages belond to an npm organization)`, { onlyOnce: true });
            return true;
        }
        if (depName.split('/')[1]?.startsWith('stem-')) {
            return true;
        }
        return false;
    });
    return stemPkgNames;
}
function getUserPackageJson(userRootDir) {
    (0, utils_js_1.assertPosixPath)(userRootDir);
    const userPkgJsonPath = path_1.default.posix.join(userRootDir, './package.json');
    let userPkgJson;
    try {
        userPkgJson = require_(userPkgJsonPath);
    }
    catch {
        throw new Error(`No package.json found at ${userRootDir}`);
    }
    return userPkgJson;
}
