"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGuardHook = void 0;
const getHook_js_1 = require("../hooks/getHook.js");
const utils_js_1 = require("./utils.js");
async function executeGuardHook(pageContext, prepareForUserConsumption) {
    let hook;
    if (pageContext._pageFilesAll.length > 0) {
        // V0.4 design
        (0, utils_js_1.assert)(pageContext._pageConfigs.length === 0);
        hook = findPageGuard(pageContext._pageId, pageContext._pageFilesAll);
    }
    else {
        // V1 design
        hook = (0, getHook_js_1.getHook)(pageContext, 'guard');
    }
    if (!hook)
        return;
    const guard = hook.hookFn;
    let pageContextForUserConsumption = pageContext;
    const res = prepareForUserConsumption(pageContext);
    if (res)
        pageContextForUserConsumption = res;
    const hookResult = await (0, utils_js_1.executeHook)(() => guard(pageContextForUserConsumption), 'guard', hook.hookFilePath);
    (0, utils_js_1.assertUsage)(hookResult === undefined, `The guard() hook of ${hook.hookFilePath} returns a value, but guard() doesn't accept any return value`);
}
exports.executeGuardHook = executeGuardHook;
function findPageGuard(pageId, pageFilesAll) {
    const pageRouteFile = pageFilesAll.find((p) => p.pageId === pageId && p.fileType === '.page.route');
    if (!pageRouteFile)
        return null;
    const { filePath, fileExports } = pageRouteFile;
    (0, utils_js_1.assert)(fileExports); // loadPageRoutes() should already have been called
    const hookFn = fileExports.guard;
    if (!hookFn)
        return null;
    const hookFilePath = filePath;
    (0, utils_js_1.assertUsage)((0, utils_js_1.isCallable)(hookFn), `guard() defined by ${hookFilePath} should be a function`);
    return { hookFn, hookName: 'guard', hookFilePath };
}
