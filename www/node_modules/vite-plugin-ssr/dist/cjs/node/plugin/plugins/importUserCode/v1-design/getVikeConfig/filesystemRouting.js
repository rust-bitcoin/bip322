"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogicalPath = exports.applyFilesystemRoutingRootEffect = exports.isGlobalLocation = exports.sortAfterInheritanceOrder = exports.getLocationId = exports.isInherited = exports.getFilesystemRouteDefinedBy = exports.getFilesystemRouteString = void 0;
const utils_js_1 = require("../../../../utils.js");
/**
 * getLocationId('/pages/some-page/+Page.js') => '/pages/some-page'
 * getLocationId('/pages/some-page') => '/pages/some-page'
 * getLocationId('/renderer/+config.js') => '/renderer'
 */
function getLocationId(somePath) {
    const locationId = removeFilename(somePath, true);
    assertLocationId(locationId);
    return locationId;
}
exports.getLocationId = getLocationId;
/** Get URL determined by filesystem path */
function getFilesystemRouteString(locationId) {
    return getLogicalPath(locationId, ['renderer', 'pages', 'src', 'index']);
}
exports.getFilesystemRouteString = getFilesystemRouteString;
/** Get apply root for config inheritance */
function getInheritanceRoot(someDir) {
    return getLogicalPath(someDir, ['renderer']);
}
/**
 * getLogicalPath('/pages/some-page', ['pages']) => '/some-page'
 * getLogicalPath('some-npm-pkg/renderer', ['renderer']) => '/'
 */
function getLogicalPath(someDir, removeDirs) {
    someDir = removeNpmPackageName(someDir);
    someDir = removeDirectories(someDir, removeDirs);
    assertIsPath(someDir);
    return someDir;
}
exports.getLogicalPath = getLogicalPath;
/** Whether configs defined in `locationId` apply in every `locationIds` */
function isGlobalLocation(locationId, locationIds) {
    return locationIds.every((locId) => isInherited(locationId, locId) || locationIsRendererDir(locId));
}
exports.isGlobalLocation = isGlobalLocation;
function sortAfterInheritanceOrder(locationId1, locationId2, locationIdPage) {
    const inheritanceRoot1 = getInheritanceRoot(locationId1);
    const inheritanceRoot2 = getInheritanceRoot(locationId2);
    const inheritanceRootPage = getInheritanceRoot(locationIdPage);
    // sortAfterInheritanceOrder() only works if both locationId1 and locationId2 are inherited by the same page
    (0, utils_js_1.assert)(isInherited(locationId1, locationIdPage));
    (0, utils_js_1.assert)(isInherited(locationId2, locationIdPage));
    // Equivalent assertion (see isInherited() implementation)
    (0, utils_js_1.assert)(startsWith(inheritanceRootPage, inheritanceRoot1));
    (0, utils_js_1.assert)(startsWith(inheritanceRootPage, inheritanceRoot2));
    if (inheritanceRoot1 !== inheritanceRoot2) {
        // Should be true since locationId1 and locationId2 are both inherited by the same page
        (0, utils_js_1.assert)(startsWith(inheritanceRoot1, inheritanceRoot2) || startsWith(inheritanceRoot2, inheritanceRoot1));
        (0, utils_js_1.assert)(inheritanceRoot1.length !== inheritanceRoot2.length);
        return (0, utils_js_1.higherFirst)((inheritanceRoot) => inheritanceRoot.length)(inheritanceRoot1, inheritanceRoot2);
    }
    // Should be true since we aggregate interface files by locationId
    (0, utils_js_1.assert)(locationId1 !== locationId2);
    // locationId1 first, i.e. `indexOf(locationId1) < indexOf(locationId2)`
    const locationId1First = -1;
    // locationId2 first, i.e. `indexOf(locationId2) < indexOf(locationId1)`
    const locationId2First = 1;
    if (locationIsNpmPackage(locationId1) !== locationIsNpmPackage(locationId2)) {
        return locationIsNpmPackage(locationId1) ? locationId2First : locationId1First;
    }
    if (locationIsRendererDir(locationId1) !== locationIsRendererDir(locationId2)) {
        return locationIsRendererDir(locationId1) ? locationId2First : locationId1First;
    }
    // Doesn't have any function beyond making the order deterministic
    //  - Although we make /src/renderer/+config.js override /renderer/+config.js which potentially can make somewhat sense (e.g. when ejecting a renderer)
    if (locationId1.length !== locationId2.length) {
        return (0, utils_js_1.higherFirst)((locationId) => locationId.length)(locationId1, locationId2);
    }
    return locationId1 > locationId2 ? locationId1First : locationId2First;
}
exports.sortAfterInheritanceOrder = sortAfterInheritanceOrder;
function locationIsNpmPackage(locationId) {
    return !locationId.startsWith('/');
}
function locationIsRendererDir(locationId) {
    return locationId.split('/').includes('renderer');
}
/** Whether configs defined at `locationId1` also apply at `locationId2` */
function isInherited(locationId1, locationId2) {
    const inheritanceRoot1 = getInheritanceRoot(locationId1);
    const inheritanceRoot2 = getInheritanceRoot(locationId2);
    return startsWith(inheritanceRoot2, inheritanceRoot1);
}
exports.isInherited = isInherited;
function removeNpmPackageName(somePath) {
    if (!(0, utils_js_1.isNpmPackageImport)(somePath)) {
        (0, utils_js_1.assert)(somePath.startsWith('/'));
        return somePath;
    }
    const importPath = (0, utils_js_1.getNpmPackageImportPath)(somePath);
    if (!importPath)
        return '/';
    (0, utils_js_1.assertPosixPath)(importPath);
    (0, utils_js_1.assert)(!importPath.startsWith('/'));
    somePath = '/' + importPath;
    return somePath;
}
function removeDirectories(somePath, removeDirs) {
    (0, utils_js_1.assertPosixPath)(somePath);
    somePath = somePath
        .split('/')
        .filter((p) => !removeDirs.includes(p))
        .join('/');
    if (somePath === '')
        somePath = '/';
    return somePath;
}
function removeFilename(filePath, optional) {
    (0, utils_js_1.assertPosixPath)(filePath);
    (0, utils_js_1.assert)(filePath.startsWith('/') || (0, utils_js_1.isNpmPackageImport)(filePath));
    {
        const filename = filePath.split('/').slice(-1)[0];
        if (!filename.includes('.')) {
            (0, utils_js_1.assert)(optional);
            return filePath;
        }
    }
    filePath = filePath.split('/').slice(0, -1).join('/');
    if (filePath === '')
        filePath = '/';
    assertLocationId(filePath);
    return filePath;
}
function getFilesystemRouteDefinedBy(locationId) {
    if (locationId === '/')
        return locationId;
    (0, utils_js_1.assert)(!locationId.endsWith('/'));
    const routeFilesystemDefinedBy = locationId + '/';
    return routeFilesystemDefinedBy;
}
exports.getFilesystemRouteDefinedBy = getFilesystemRouteDefinedBy;
function applyFilesystemRoutingRootEffect(routeFilesystem, filesystemRoutingRootEffect) {
    const { before, after } = filesystemRoutingRootEffect;
    (0, utils_js_1.assert)(after.startsWith('/'));
    (0, utils_js_1.assert)(routeFilesystem.startsWith(before));
    routeFilesystem = after + '/' + routeFilesystem.slice(before.length);
    routeFilesystem = '/' + routeFilesystem.split('/').filter(Boolean).join('/');
    return routeFilesystem;
}
exports.applyFilesystemRoutingRootEffect = applyFilesystemRoutingRootEffect;
function assertLocationId(locationId) {
    (0, utils_js_1.assert)(locationId.startsWith('/') || (0, utils_js_1.isNpmPackageImport)(locationId));
    (0, utils_js_1.assert)(!locationId.endsWith('/') || locationId === '/');
}
function assertIsPath(logicalPath) {
    (0, utils_js_1.assert)(logicalPath.startsWith('/'));
    (0, utils_js_1.assert)(!logicalPath.endsWith('/') || logicalPath === '/');
}
/** Whether `inheritanceRoot1` starts with `inheritanceRoot2` */
function startsWith(inheritanceRoot1, inheritanceRoot2) {
    assertIsPath(inheritanceRoot1);
    assertIsPath(inheritanceRoot2);
    const segments1 = inheritanceRoot1.split('/').filter(Boolean);
    const segments2 = inheritanceRoot2.split('/').filter(Boolean);
    for (const i in segments2) {
        const segment1 = segments1[i];
        const segment2 = segments2[i];
        if (segment1 !== segment2) {
            /* This assertion fails for:
               ```
               inheritanceRoot1: '/pages/about2'
               inheritanceRoot2: '/pages/about'
               ```
            assert(!inheritanceRoot1.startsWith(inheritanceRoot2))
            */
            return false;
        }
    }
    (0, utils_js_1.assert)(inheritanceRoot1.startsWith(inheritanceRoot2));
    return true;
}
