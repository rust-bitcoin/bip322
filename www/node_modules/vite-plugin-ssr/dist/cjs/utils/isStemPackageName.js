"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStemPackageName = void 0;
function isStemPackageName(npmPackageName) {
    if (npmPackageName.startsWith('stem-')) {
        return true;
    }
    const [orgName, pkgName] = npmPackageName.split('/');
    if (orgName.startsWith('@') && pkgName?.startsWith('stem-')) {
        return true;
    }
    return false;
}
exports.isStemPackageName = isStemPackageName;
