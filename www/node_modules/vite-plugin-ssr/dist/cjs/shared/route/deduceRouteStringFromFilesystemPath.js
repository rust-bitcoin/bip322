"use strict";
// Unit tests at ./deduceRouteStringFromFilesystemPath.spec.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.deduceRouteStringFromFilesystemPath = void 0;
const utils_js_1 = require("./utils.js");
// TODO/next-major-update: remove this and whole filesystemRoot mechanism
function deduceRouteStringFromFilesystemPath(pageId, filesystemRoots) {
    // Handle Filesystem Routing Root
    const filesystemRootsMatch = filesystemRoots
        .filter(({ filesystemRoot }) => pageId.startsWith(filesystemRoot))
        .sort((0, utils_js_1.higherFirst)(({ filesystemRoot }) => filesystemRoot.length));
    const fsBase = filesystemRootsMatch[0];
    let filesystemRoute;
    if (fsBase) {
        // Example values:
        //  - `{"pageId":"/pages/index","filesystemRoot":"/","urlRoot":"/client_portal"}`
        const { filesystemRoot, urlRoot } = fsBase;
        const debugInfo = { pageId, filesystemRoot, urlRoot };
        (0, utils_js_1.assert)(urlRoot.startsWith('/') && pageId.startsWith('/') && filesystemRoot.startsWith('/'), debugInfo);
        (0, utils_js_1.assert)(pageId.startsWith(filesystemRoot), debugInfo);
        if (filesystemRoot !== '/') {
            (0, utils_js_1.assert)(!filesystemRoot.endsWith('/'), debugInfo);
            filesystemRoute = (0, utils_js_1.slice)(pageId, filesystemRoot.length, 0);
        }
        else {
            filesystemRoute = pageId;
        }
        (0, utils_js_1.assert)(filesystemRoute.startsWith('/'), debugInfo);
        filesystemRoute = urlRoot + (urlRoot.endsWith('/') ? '' : '/') + (0, utils_js_1.slice)(filesystemRoute, 1, 0);
    }
    else {
        filesystemRoute = pageId;
    }
    (0, utils_js_1.assert)(filesystemRoute.startsWith('/'));
    // Remove `pages/`, `index/, and `src/`, directories
    filesystemRoute = filesystemRoute
        .split('/')
        .filter((dir) => dir !== 'pages' && dir !== 'src' && dir !== 'index')
        .join('/');
    // Hanlde `/index.page.*` suffix
    (0, utils_js_1.assert)(!filesystemRoute.includes('.page.'));
    (0, utils_js_1.assert)(!filesystemRoute.endsWith('.'));
    if (filesystemRoute.endsWith('/index')) {
        filesystemRoute = (0, utils_js_1.slice)(filesystemRoute, 0, -'/index'.length);
    }
    if (filesystemRoute === '') {
        filesystemRoute = '/';
    }
    (0, utils_js_1.assert)(filesystemRoute.startsWith('/'));
    (0, utils_js_1.assert)(!filesystemRoute.endsWith('/') || filesystemRoute === '/');
    return filesystemRoute;
}
exports.deduceRouteStringFromFilesystemPath = deduceRouteStringFromFilesystemPath;
