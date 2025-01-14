// Move to standalone package? E.g. https://www.npmjs.com/package/stem
export { getStemPackages };
import path from 'path';
import { assert, assertUsage, assertWarning, toPosixPath, assertPosixPath, getDependencyRootDir, findUserPackageJsonPath } from '../../utils.js';
import { import_ } from '@brillout/import';
import { createRequire } from 'module';
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = import.meta.url;
const require_ = createRequire(importMetaUrl);
async function getStemPackages(userAppRootDir) {
    const userRootDir = findUserRootDir(userAppRootDir);
    const userPkgJson = getUserPackageJson(userRootDir);
    const stemPkgNames = getStemPkgNames(userPkgJson);
    const stemPackages = await Promise.all(stemPkgNames.map((stemPackageName) => {
        assert(stemPackageName.includes('stem-'));
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
                : await import_(modulePath);
            return moduleExports;
        };
        const stemPackageRootDir = getDependencyRootDir(stemPackageName, userAppRootDir);
        return {
            stemPackageName,
            stemPackageRootDir,
            loadModule
        };
    }));
    return stemPackages;
}
function findUserRootDir(userAppRootDir) {
    const userPkgJsonPath = findUserPackageJsonPath(userAppRootDir);
    assertUsage(userPkgJsonPath, `Couldn't find package.json in any parent directory starting from ${userAppRootDir}`);
    return toPosixPath(path.dirname(userPkgJsonPath));
}
function getStemPkgNames(userPkgJson) {
    const stemPkgNames = Object.keys(userPkgJson.dependencies ?? {}).filter((depName) => {
        if (depName.startsWith('stem-')) {
            assertWarning(false, `${depName} should be renamed to @someNpmOrgOrUser/${depName} (to follow the convention that all Stem packages belond to an npm organization)`, { onlyOnce: true });
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
    assertPosixPath(userRootDir);
    const userPkgJsonPath = path.posix.join(userRootDir, './package.json');
    let userPkgJson;
    try {
        userPkgJson = require_(userPkgJsonPath);
    }
    catch {
        throw new Error(`No package.json found at ${userRootDir}`);
    }
    return userPkgJson;
}
