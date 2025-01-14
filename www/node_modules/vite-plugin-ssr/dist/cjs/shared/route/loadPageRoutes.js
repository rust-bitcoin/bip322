"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPageRoutes = void 0;
const error_page_js_1 = require("../error-page.js");
const utils_js_1 = require("./utils.js");
const deduceRouteStringFromFilesystemPath_js_1 = require("./deduceRouteStringFromFilesystemPath.js");
const utils_js_2 = require("../utils.js");
const utils_js_3 = require("../page-configs/utils.js");
const resolveRouteFunction_js_1 = require("./resolveRouteFunction.js");
async function loadPageRoutes(
// TODO: remove all arguments and use GlobalContext instead
pageFilesAll, pageConfigs, pageConfigGlobal, allPageIds) {
    await Promise.all(pageFilesAll.filter((p) => p.fileType === '.page.route').map((p) => p.loadFile?.()));
    const { onBeforeRouteHook, filesystemRoots } = getGlobalHooks(pageFilesAll, pageConfigs, pageConfigGlobal);
    const pageRoutes = getPageRoutes(filesystemRoots, pageFilesAll, pageConfigs, allPageIds);
    return { pageRoutes, onBeforeRouteHook };
}
exports.loadPageRoutes = loadPageRoutes;
function getPageRoutes(filesystemRoots, pageFilesAll, pageConfigs, allPageIds) {
    const pageRoutes = [];
    let pageIds = [...allPageIds];
    // V1 Design
    if (pageConfigs.length > 0) {
        (0, utils_js_1.assert)(filesystemRoots === null);
        const comesFromV1PageConfig = true;
        pageConfigs
            .filter((p) => !p.isErrorPage)
            .forEach((pageConfig) => {
            const pageId = pageConfig.pageId;
            pageIds = removePageId(pageIds, pageId);
            let pageRoute = null;
            {
                const configName = 'route';
                const configValue = (0, utils_js_3.getConfigValue)(pageConfig, configName);
                if (configValue) {
                    const definedAtInfo = (0, utils_js_3.getConfigDefinedAtInfo)(pageConfig, configName);
                    const route = configValue.value;
                    const definedAt = (0, utils_js_3.getDefinedAtString)(definedAtInfo);
                    if (typeof route === 'string') {
                        pageRoute = {
                            pageId,
                            comesFromV1PageConfig,
                            routeString: route,
                            routeDefinedAt: definedAt,
                            routeType: 'STRING'
                        };
                    }
                    else {
                        (0, utils_js_1.assert)((0, utils_js_2.isCallable)(route));
                        if ((0, utils_js_3.getConfigValue)(pageConfig, 'iKnowThePerformanceRisksOfAsyncRouteFunctions', 'boolean'))
                            (0, resolveRouteFunction_js_1.warnDeprecatedAllowKey)();
                        pageRoute = {
                            pageId,
                            comesFromV1PageConfig,
                            routeFunction: route,
                            routeDefinedAt: definedAt,
                            routeType: 'FUNCTION'
                        };
                    }
                }
            }
            if (!pageRoute) {
                const { routeFilesystem } = pageConfig;
                (0, utils_js_1.assert)(routeFilesystem);
                const { routeString, definedBy } = routeFilesystem;
                (0, utils_js_1.assert)(routeFilesystem.routeString.startsWith('/'));
                pageRoute = {
                    pageId,
                    routeFilesystemDefinedBy: definedBy,
                    comesFromV1PageConfig,
                    routeString,
                    routeDefinedAt: null,
                    routeType: 'FILESYSTEM'
                };
            }
            (0, utils_js_1.assert)(pageRoute);
            pageRoutes.push(pageRoute);
        });
    }
    // Old design
    // TODO/v1-release: remove
    if (pageConfigs.length === 0) {
        (0, utils_js_1.assert)(filesystemRoots);
        const comesFromV1PageConfig = false;
        pageIds
            .filter((pageId) => !(0, error_page_js_1.isErrorPageId)(pageId, false))
            .forEach((pageId) => {
            const pageRouteFile = pageFilesAll.find((p) => p.pageId === pageId && p.fileType === '.page.route');
            if (!pageRouteFile || !('default' in pageRouteFile.fileExports)) {
                const routeString = (0, deduceRouteStringFromFilesystemPath_js_1.deduceRouteStringFromFilesystemPath)(pageId, filesystemRoots);
                (0, utils_js_1.assert)(routeString.startsWith('/'));
                (0, utils_js_1.assert)(!routeString.endsWith('/') || routeString === '/');
                pageRoutes.push({
                    pageId,
                    comesFromV1PageConfig,
                    routeString,
                    routeDefinedAt: null,
                    routeFilesystemDefinedBy: `${pageId}.page.*`,
                    routeType: 'FILESYSTEM'
                });
            }
            else {
                const { filePath, fileExports } = pageRouteFile;
                (0, utils_js_1.assert)(fileExports.default);
                if ((0, utils_js_1.hasProp)(fileExports, 'default', 'string')) {
                    const routeString = fileExports.default;
                    (0, utils_js_1.assertUsage)(routeString.startsWith('/'), `A Route String should start with a leading slash '/' but ${filePath} has \`export default '${routeString}'\`. Make sure to \`export default '/${routeString}'\` instead.`);
                    pageRoutes.push({
                        pageId,
                        comesFromV1PageConfig,
                        routeString,
                        routeDefinedAt: filePath,
                        routeType: 'STRING'
                    });
                    return;
                }
                if ((0, utils_js_1.hasProp)(fileExports, 'default', 'function')) {
                    const routeFunction = fileExports.default;
                    {
                        const allowKey = 'iKnowThePerformanceRisksOfAsyncRouteFunctions';
                        if (allowKey in fileExports) {
                            (0, resolveRouteFunction_js_1.warnDeprecatedAllowKey)();
                        }
                    }
                    pageRoutes.push({
                        pageId,
                        comesFromV1PageConfig,
                        routeFunction,
                        routeDefinedAt: filePath,
                        routeType: 'FUNCTION'
                    });
                    return;
                }
                (0, utils_js_1.assertUsage)(false, `The default export of ${filePath} should be a string or a function.`);
            }
        });
    }
    return pageRoutes;
}
function getGlobalHooks(pageFilesAll, pageConfigs, pageConfigGlobal) {
    // V1 Design
    if (pageConfigs.length > 0) {
        if (pageConfigGlobal.onBeforeRoute) {
            const hookFn = pageConfigGlobal.onBeforeRoute.value;
            if (hookFn) {
                (0, utils_js_1.assert)(!pageConfigGlobal.onBeforeRoute.isComputed);
                const hookFilePath = pageConfigGlobal.onBeforeRoute.definedAtInfo.filePath;
                (0, utils_js_1.assert)(hookFilePath);
                (0, utils_js_1.assertUsage)((0, utils_js_2.isCallable)(hookFn), `The hook onBeforeRoute() defined by ${hookFilePath} should be a function.`);
                const onBeforeRouteHook = {
                    hookFilePath: hookFilePath,
                    onBeforeRoute: hookFn
                };
                return { onBeforeRouteHook, filesystemRoots: null };
            }
        }
        return { onBeforeRouteHook: null, filesystemRoots: null };
    }
    // Old design
    // TODO/v1-release: remove
    let onBeforeRouteHook = null;
    const filesystemRoots = [];
    pageFilesAll
        .filter((p) => p.fileType === '.page.route' && p.isDefaultPageFile)
        .forEach(({ filePath, fileExports }) => {
        (0, utils_js_1.assert)(fileExports);
        if ('onBeforeRoute' in fileExports) {
            (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(fileExports, 'onBeforeRoute', 'function'), `\`export { onBeforeRoute }\` of ${filePath} should be a function.`);
            const { onBeforeRoute } = fileExports;
            onBeforeRouteHook = { hookFilePath: `${filePath} > \`export { onBeforeRoute }\``, onBeforeRoute };
        }
        if ('filesystemRoutingRoot' in fileExports) {
            (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(fileExports, 'filesystemRoutingRoot', 'string'), `\`export { filesystemRoutingRoot }\` of ${filePath} should be a string.`);
            (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(fileExports, 'filesystemRoutingRoot', 'string'), `\`export { filesystemRoutingRoot }\` of ${filePath} is \`'${fileExports.filesystemRoutingRoot}'\` but it should start with a leading slash \`/\`.`);
            filesystemRoots.push({
                filesystemRoot: dirname(filePath),
                urlRoot: fileExports.filesystemRoutingRoot
            });
        }
    });
    return { onBeforeRouteHook, filesystemRoots };
}
function dirname(filePath) {
    (0, utils_js_1.assert)(filePath.startsWith('/'));
    (0, utils_js_1.assert)(!filePath.endsWith('/'));
    const paths = filePath.split('/');
    const dirPath = (0, utils_js_1.slice)(paths, 0, -1).join('/') || '/';
    (0, utils_js_1.assert)(dirPath.startsWith('/'));
    (0, utils_js_1.assert)(!dirPath.endsWith('/') || dirPath === '/');
    return dirPath;
}
function removePageId(pageIds, pageId) {
    const { length } = pageIds;
    pageIds = pageIds.filter((id) => id !== pageId);
    (0, utils_js_1.assert)(pageIds.length === length - 1);
    return pageIds;
}
