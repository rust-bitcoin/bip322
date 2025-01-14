"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prerenderForceExit = exports.prerenderFromAutoFullBuild = exports.prerenderFromCLI = exports.prerenderFromAPI = void 0;
require("../runtime/page-files/setup.js");
const path_1 = __importDefault(require("path"));
const index_js_1 = require("../../shared/route/index.js");
const utils_js_1 = require("./utils.js");
const pLimit_js_1 = require("../../utils/pLimit.js");
const renderPageAlreadyRouted_js_1 = require("../runtime/renderPage/renderPageAlreadyRouted.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const os_1 = require("os");
const globalContext_js_1 = require("../runtime/globalContext.js");
const vite_1 = require("vite");
const getConfigVps_js_1 = require("../shared/getConfigVps.js");
const getPageFiles_js_1 = require("../../shared/getPageFiles.js");
const getPageContextRequestUrl_js_1 = require("../../shared/getPageContextRequestUrl.js");
const resolveRouteString_js_1 = require("../../shared/route/resolveRouteString.js");
const utils_js_2 = require("../../shared/page-configs/utils.js");
const loadPageCode_js_1 = require("../../shared/page-configs/loadPageCode.js");
const error_page_js_1 = require("../../shared/error-page.js");
const addUrlComputedProps_js_1 = require("../../shared/addUrlComputedProps.js");
const assertPathIsFilesystemAbsolute_js_1 = require("../../utils/assertPathIsFilesystemAbsolute.js");
const abort_js_1 = require("../../shared/route/abort.js");
const loadPageFilesServerSide_js_1 = require("../runtime/renderPage/loadPageFilesServerSide.js");
const getHook_js_1 = require("../../shared/hooks/getHook.js");
async function prerenderFromAPI(options = {}) {
    await runPrerender(options, 'prerender()');
}
exports.prerenderFromAPI = prerenderFromAPI;
async function prerenderFromCLI(options) {
    await runPrerender(options, '$ vite-plugin-ssr prerender');
}
exports.prerenderFromCLI = prerenderFromCLI;
async function prerenderFromAutoFullBuild(options) {
    await runPrerender(options, null);
}
exports.prerenderFromAutoFullBuild = prerenderFromAutoFullBuild;
async function runPrerender(options, manuallyTriggered) {
    checkOutdatedOptions(options);
    const logLevel = !!options.onPagePrerender ? 'warn' : 'info';
    if (logLevel === 'info') {
        console.log(`${picocolors_1.default.cyan(`vite-plugin-ssr v${utils_js_1.projectInfo.projectVersion}`)} ${picocolors_1.default.green('pre-rendering HTML...')}`);
    }
    (0, utils_js_1.setNodeEnvToProduction)();
    await disableReactStreaming();
    const viteConfig = await (0, vite_1.resolveConfig)(options.viteConfig || {}, 'vite-plugin-ssr pre-rendering', 'production');
    assertLoadedConfig(viteConfig, options);
    const configVps = await (0, getConfigVps_js_1.getConfigVps)(viteConfig);
    const { outDirClient, outDirRoot } = (0, utils_js_1.getOutDirs_prerender)(viteConfig);
    const { root } = viteConfig;
    const prerenderConfig = configVps.prerender;
    if (!prerenderConfig) {
        (0, utils_js_1.assert)(manuallyTriggered);
        (0, utils_js_1.assertWarning)(prerenderConfig, `You're executing ${picocolors_1.default.cyan(manuallyTriggered)} but the config ${picocolors_1.default.cyan('prerender')} isn't set to true`, {
            onlyOnce: true
        });
    }
    const { partial = false, noExtraDir = false, parallel = true } = prerenderConfig || {};
    const concurrencyLimit = (0, pLimit_js_1.pLimit)(parallel === false || parallel === 0 ? 1 : parallel === true || parallel === undefined ? (0, os_1.cpus)().length : parallel);
    (0, assertPathIsFilesystemAbsolute_js_1.assertPathIsFilesystemAbsolute)(outDirRoot); // Needed for loadServerBuild(outDir) of @brillout/vite-plugin-import-build
    await (0, globalContext_js_1.initGlobalContext)(true, outDirRoot);
    const renderContext = await (0, renderPageAlreadyRouted_js_1.getRenderContext)();
    renderContext.pageFilesAll.forEach(assertExportNames);
    const prerenderContext = {};
    (0, utils_js_1.objectAssign)(prerenderContext, {
        _urlHandler: null,
        _noExtraDir: noExtraDir ?? false,
        pageContexts: [],
        pageContextInit: options.pageContextInit ?? null
    });
    const doNotPrerenderList = [];
    await collectDoNoPrerenderList(renderContext, doNotPrerenderList, concurrencyLimit);
    await callOnBeforePrerenderStartHooks(prerenderContext, renderContext, concurrencyLimit);
    await handlePagesWithStaticRoutes(prerenderContext, renderContext, doNotPrerenderList, concurrencyLimit);
    await callOnPrerenderStartHook(prerenderContext, renderContext);
    const prerenderPageIds = {};
    const htmlFiles = [];
    await routeAndPrerender(prerenderContext, htmlFiles, prerenderPageIds, concurrencyLimit);
    warnContradictoryNoPrerenderList(prerenderPageIds, doNotPrerenderList);
    await prerender404(htmlFiles, renderContext, prerenderContext);
    if (logLevel === 'info') {
        console.log(`${picocolors_1.default.green(`✓`)} ${htmlFiles.length} HTML documents pre-rendered.`);
    }
    await Promise.all(htmlFiles.map((htmlFile) => writeHtmlFile(htmlFile, root, outDirClient, concurrencyLimit, options.onPagePrerender, logLevel)));
    warnMissingPages(prerenderPageIds, doNotPrerenderList, renderContext, partial);
}
async function collectDoNoPrerenderList(renderContext, doNotPrerenderList, concurrencyLimit) {
    renderContext.pageConfigs.forEach((pageConfig) => {
        const configName = 'prerender';
        const configValue = (0, utils_js_2.getConfigValue)(pageConfig, configName, 'boolean');
        if (configValue?.value === false) {
            const definedAtInfo = (0, utils_js_2.getConfigDefinedAtInfo)(pageConfig, configName);
            doNotPrerenderList.push({
                pageId: pageConfig.pageId,
                setByConfigName: 'prerender',
                setByConfigValue: false,
                setByConfigFile: definedAtInfo.filePath
            });
        }
    });
    await Promise.all(renderContext.pageFilesAll
        .filter((p) => {
        assertExportNames(p);
        if (!p.exportNames?.includes('doNotPrerender'))
            return false;
        (0, utils_js_1.assertUsage)(p.fileType !== '.page.client', `${p.filePath} (which is a \`.page.client.js\` file) has \`export { doNotPrerender }\` but it is only allowed in \`.page.server.js\` or \`.page.js\` files`);
        return true;
    })
        .map((p) => concurrencyLimit(async () => {
        (0, utils_js_1.assert)(p.loadFile);
        await p.loadFile();
    })));
    renderContext.allPageIds.forEach((pageId) => {
        const pageFilesServerSide = (0, getPageFiles_js_1.getPageFilesServerSide)(renderContext.pageFilesAll, pageId);
        for (const p of pageFilesServerSide) {
            if (!p.exportNames?.includes('doNotPrerender'))
                continue;
            const { fileExports } = p;
            (0, utils_js_1.assert)(fileExports);
            (0, utils_js_1.assert)((0, utils_js_1.hasProp)(fileExports, 'doNotPrerender'));
            const { doNotPrerender } = fileExports;
            (0, utils_js_1.assertUsage)(doNotPrerender === true || doNotPrerender === false, `The \`export { doNotPrerender }\` value of ${p.filePath} should be \`true\` or \`false\``);
            if (!doNotPrerender) {
                // Do pre-render `pageId`
                return;
            }
            else {
                // Don't pre-render `pageId`
                doNotPrerenderList.push({
                    pageId,
                    setByConfigFile: p.filePath,
                    setByConfigName: 'doNotPrerender',
                    setByConfigValue: doNotPrerender
                });
            }
        }
    });
}
function assertExportNames(pageFile) {
    const { exportNames, fileType } = pageFile;
    (0, utils_js_1.assert)(exportNames || fileType === '.page.route' || fileType === '.css', pageFile.filePath);
}
async function callOnBeforePrerenderStartHooks(prerenderContext, renderContext, concurrencyLimit) {
    const onBeforePrerenderStartHooks = [];
    // V1 design
    await Promise.all(renderContext.pageConfigs.map((pageConfig) => concurrencyLimit(async () => {
        const hookName = 'onBeforePrerenderStart';
        const pageConfigLoaded = await (0, loadPageCode_js_1.loadPageCode)(pageConfig, false);
        const configValue = (0, utils_js_2.getConfigValue)(pageConfigLoaded, hookName);
        if (!configValue)
            return;
        const hookFn = configValue.value;
        const definedAtInfo = (0, utils_js_2.getConfigDefinedAtInfo)(pageConfigLoaded, hookName);
        const hookFilePath = definedAtInfo.filePath;
        (0, utils_js_1.assert)(hookFilePath);
        (0, getHook_js_1.assertHookFn)(hookFn, { hookName, hookFilePath });
        onBeforePrerenderStartHooks.push({
            hookFn,
            hookName: 'onBeforePrerenderStart',
            hookFilePath
        });
    })));
    // 0.4 design
    await Promise.all(renderContext.pageFilesAll
        .filter((p) => {
        assertExportNames(p);
        if (!p.exportNames?.includes('prerender'))
            return false;
        (0, utils_js_1.assertUsage)(p.fileType === '.page.server', `${p.filePath} (which is a \`${p.fileType}.js\` file) has \`export { prerender }\` but it is only allowed in \`.page.server.js\` files`);
        return true;
    })
        .map((p) => concurrencyLimit(async () => {
        await p.loadFile?.();
        const hookFn = p.fileExports?.prerender;
        if (!hookFn)
            return;
        (0, utils_js_1.assertUsage)((0, utils_js_1.isCallable)(hookFn), `\`export { prerender }\` of ${p.filePath} should be a function.`);
        const hookFilePath = p.filePath;
        (0, utils_js_1.assert)(hookFilePath);
        onBeforePrerenderStartHooks.push({
            hookFn,
            hookName: 'prerender',
            hookFilePath
        });
    })));
    await Promise.all(onBeforePrerenderStartHooks.map(({ hookFn, hookName, hookFilePath }) => concurrencyLimit(async () => {
        const prerenderResult = await hookFn();
        const result = normalizeOnPrerenderHookResult(prerenderResult, hookFilePath, hookName);
        result.forEach(({ url, pageContext }) => {
            {
                const pageContextFound = prerenderContext.pageContexts.find((pageContext) => isSameUrl(pageContext.urlOriginal, url));
                if (pageContextFound) {
                    (0, utils_js_1.assert)(pageContextFound._providedByHook);
                    const providedTwice = hookFilePath === pageContextFound._providedByHook.hookFilePath
                        ? `twice by the ${hookName}() hook (${hookFilePath})`
                        : `twice: by the ${hookName}() hook (${hookFilePath}) as well as by the hook ${pageContextFound._providedByHook.hookFilePath}() (${pageContextFound._providedByHook.hookName})`;
                    (0, utils_js_1.assertUsage)(false, `URL ${picocolors_1.default.cyan(url)} provided ${providedTwice}. Make sure to provide the URL only once instead.`);
                }
            }
            const pageContextNew = createPageContext(url, renderContext, prerenderContext);
            (0, utils_js_1.objectAssign)(pageContextNew, {
                _providedByHook: {
                    hookFilePath,
                    hookName
                }
            });
            prerenderContext.pageContexts.push(pageContextNew);
            if (pageContext) {
                (0, utils_js_1.objectAssign)(pageContextNew, {
                    _pageContextAlreadyProvidedByOnPrerenderHook: true,
                    ...pageContext
                });
            }
        });
    })));
}
async function handlePagesWithStaticRoutes(prerenderContext, renderContext, doNotPrerenderList, concurrencyLimit) {
    // Pre-render pages with a static route
    await Promise.all(renderContext.pageRoutes.map((pageRoute) => concurrencyLimit(async () => {
        const { pageId } = pageRoute;
        if (doNotPrerenderList.find((p) => p.pageId === pageId)) {
            return;
        }
        let urlOriginal;
        if (!('routeString' in pageRoute)) {
            // Abort since the page's route is a Route Function
            (0, utils_js_1.assert)(pageRoute.routeType === 'FUNCTION');
            return;
        }
        else {
            const url = (0, resolveRouteString_js_1.getUrlFromRouteString)(pageRoute.routeString);
            if (!url) {
                // Abort since no URL can be deduced from a parameterized Route String
                return;
            }
            urlOriginal = url;
        }
        (0, utils_js_1.assert)(urlOriginal.startsWith('/'));
        // Already included in a onBeforePrerenderStart() hook
        if (prerenderContext.pageContexts.find((pageContext) => isSameUrl(pageContext.urlOriginal, urlOriginal))) {
            return;
        }
        const routeParams = {};
        const pageContext = createPageContext(urlOriginal, renderContext, prerenderContext);
        (0, utils_js_1.objectAssign)(pageContext, {
            _providedByHook: null,
            routeParams,
            _pageId: pageId,
            _routeMatches: [
                {
                    pageId,
                    routeType: pageRoute.routeType,
                    routeString: urlOriginal,
                    routeParams
                }
            ]
        });
        (0, utils_js_1.objectAssign)(pageContext, await (0, loadPageFilesServerSide_js_1.loadPageFilesServerSide)(pageContext));
        prerenderContext.pageContexts.push(pageContext);
    })));
}
function createPageContext(urlOriginal, renderContext, prerenderContext) {
    const pageContext = {
        _urlHandler: null,
        _urlRewrite: null,
        _noExtraDir: prerenderContext._noExtraDir,
        _prerenderContext: prerenderContext
    };
    const pageContextInit = {
        urlOriginal,
        ...prerenderContext.pageContextInit
    };
    {
        const pageContextInitEnhanced = (0, renderPageAlreadyRouted_js_1.getPageContextInitEnhanced)(pageContextInit, renderContext, {
            // We set `enumerable` to `false` to avoid computed URL properties from being iterated & copied in a onPrerenderStart() hook, e.g. /examples/i18n/
            urlComputedPropsNonEnumerable: true
        });
        (0, utils_js_1.objectAssign)(pageContext, pageContextInitEnhanced);
    }
    return pageContext;
}
async function callOnPrerenderStartHook(prerenderContext, renderContext) {
    let onPrerenderStartHook;
    // V1 design
    if (renderContext.pageConfigs.length > 0) {
        const configValueSource = renderContext.pageConfigGlobal.onPrerenderStart;
        if (configValueSource) {
            const hookFn = configValueSource.value;
            (0, utils_js_1.assert)(!configValueSource.isComputed);
            const hookFilePath = configValueSource.definedAtInfo.filePath;
            (0, utils_js_1.assert)(hookFn);
            (0, utils_js_1.assert)(hookFilePath);
            if (hookFn) {
                onPrerenderStartHook = {
                    hookFn,
                    hookName: 'onPrerenderStart',
                    hookFilePath
                };
            }
        }
    }
    // Old design
    // TODO/v1-release: remove
    if (renderContext.pageConfigs.length === 0) {
        const pageFilesWithOnBeforePrerenderHook = renderContext.pageFilesAll.filter((p) => {
            assertExportNames(p);
            if (!p.exportNames?.includes('onBeforePrerender'))
                return false;
            (0, utils_js_1.assertUsage)(p.fileType !== '.page.client', `${p.filePath} (which is a \`.page.client.js\` file) has \`export { onBeforePrerender }\` but it is only allowed in \`.page.server.js\` or \`.page.js\` files`);
            (0, utils_js_1.assertUsage)(p.isDefaultPageFile, `${p.filePath} has \`export { onBeforePrerender }\` but it is only allowed in \`_defaut.page.\` files`);
            return true;
        });
        if (pageFilesWithOnBeforePrerenderHook.length === 0) {
            return;
        }
        (0, utils_js_1.assertUsage)(pageFilesWithOnBeforePrerenderHook.length === 1, 'There can be only one `onBeforePrerender()` hook. If you need to be able to define several, open a new GitHub issue.');
        await Promise.all(pageFilesWithOnBeforePrerenderHook.map((p) => p.loadFile?.()));
        const hooks = pageFilesWithOnBeforePrerenderHook.map((p) => {
            (0, utils_js_1.assert)(p.fileExports);
            const { onBeforePrerender } = p.fileExports;
            (0, utils_js_1.assert)(onBeforePrerender);
            const hookFilePath = p.filePath;
            return { hookFilePath, onBeforePrerender };
        });
        (0, utils_js_1.assert)(hooks.length === 1);
        const hook = hooks[0];
        onPrerenderStartHook = {
            hookFn: hook.onBeforePrerender,
            hookFilePath: hook.hookFilePath,
            hookName: 'onBeforePrerender'
        };
    }
    if (!onPrerenderStartHook) {
        return;
    }
    const msgPrefix = `The ${onPrerenderStartHook.hookName}() hook defined by ${onPrerenderStartHook.hookFilePath}`;
    const { hookFn, hookFilePath, hookName } = onPrerenderStartHook;
    (0, utils_js_1.assertUsage)((0, utils_js_1.isCallable)(hookFn), `${msgPrefix} should be a function.`);
    prerenderContext.pageContexts.forEach((pageContext) => {
        Object.defineProperty(pageContext, 'url', {
            // TODO/v1-release: remove warning
            get() {
                (0, utils_js_1.assertWarning)(false, msgPrefix +
                    ' uses pageContext.url but it should use pageContext.urlOriginal instead, see https://vite-plugin-ssr.com/migration/0.4.23', { showStackTrace: true, onlyOnce: true });
                return pageContext.urlOriginal;
            },
            enumerable: false,
            configurable: true
        });
        (0, utils_js_1.assert)((0, utils_js_1.hasPropertyGetter)(pageContext, 'url'));
        (0, utils_js_1.assert)(pageContext.urlOriginal);
        pageContext._urlOriginalBeforeHook = pageContext.urlOriginal;
    });
    const docLink = 'https://vite-plugin-ssr.com/i18n#pre-rendering';
    let result = await (0, utils_js_1.executeHook)(() => hookFn({
        pageContexts: prerenderContext.pageContexts,
        // TODO/v1-release: remove warning
        get prerenderPageContexts() {
            (0, utils_js_1.assertWarning)(false, `prerenderPageContexts has been renamed pageContexts, see ${docLink}`, {
                showStackTrace: true,
                onlyOnce: true
            });
            return prerenderContext.pageContexts;
        }
    }), hookName, hookFilePath);
    if (result === null || result === undefined) {
        return;
    }
    const errPrefix = `The ${hookName}() hook exported by ${hookFilePath}`;
    const rightUsage = `${errPrefix} should return ${picocolors_1.default.cyan('null')}, ${picocolors_1.default.cyan('undefined')}, or ${picocolors_1.default.cyan('{ prerenderContext: { pageContexts } }')}`;
    // TODO/v1-release: remove
    if ((0, utils_js_1.hasProp)(result, 'globalContext')) {
        (0, utils_js_1.assertUsage)((0, utils_js_1.isObjectWithKeys)(result, ['globalContext']) &&
            (0, utils_js_1.hasProp)(result, 'globalContext', 'object') &&
            (0, utils_js_1.hasProp)(result.globalContext, 'prerenderPageContexts', 'array'), rightUsage);
        (0, utils_js_1.assertWarning)(false, `${errPrefix} returns ${picocolors_1.default.cyan('{ globalContext: { prerenderPageContexts } }')} but the return value has been renamed to ${picocolors_1.default.cyan('{ prerenderContext: { pageContexts } }')}, see ${docLink}`, { onlyOnce: true });
        result = {
            prerenderContext: {
                pageContexts: result.globalContext.prerenderPageContexts
            }
        };
    }
    (0, utils_js_1.assertUsage)((0, utils_js_1.isObjectWithKeys)(result, ['prerenderContext']) &&
        (0, utils_js_1.hasProp)(result, 'prerenderContext', 'object') &&
        (0, utils_js_1.hasProp)(result.prerenderContext, 'pageContexts', 'array'), rightUsage);
    prerenderContext.pageContexts = result.prerenderContext.pageContexts;
    prerenderContext.pageContexts.forEach((pageContext) => {
        // TODO/v1-release: remove
        if (!(0, utils_js_1.hasPropertyGetter)(pageContext, 'url') && pageContext.url) {
            (0, utils_js_1.assertWarning)(false, msgPrefix +
                ' provided pageContext.url but it should provide pageContext.urlOriginal instead, see https://vite-plugin-ssr.com/migration/0.4.23', { onlyOnce: true });
            pageContext.urlOriginal = pageContext.url;
        }
        delete pageContext.url;
    });
    prerenderContext.pageContexts.forEach((pageContext) => {
        if (pageContext.urlOriginal !== pageContext._urlOriginalBeforeHook) {
            pageContext._urlOriginalModifiedByHook = {
                hookFilePath,
                hookName
            };
        }
        // Restore as URL computed props are lost when user makes a pageContext copy
        (0, addUrlComputedProps_js_1.addUrlComputedProps)(pageContext);
    });
}
async function routeAndPrerender(prerenderContext, htmlFiles, prerenderPageIds, concurrencyLimit) {
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    (0, utils_js_1.assert)(globalContext.isPrerendering);
    // Route all URLs
    await Promise.all(prerenderContext.pageContexts.map((pageContext) => concurrencyLimit(async () => {
        const { urlOriginal } = pageContext;
        (0, utils_js_1.assert)(urlOriginal);
        const routeResult = await (0, index_js_1.route)(pageContext);
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(routeResult.pageContextAddendum, '_pageId', 'null') ||
            (0, utils_js_1.hasProp)(routeResult.pageContextAddendum, '_pageId', 'string'));
        if (routeResult.pageContextAddendum._pageId === null) {
            let hookName;
            let hookFilePath;
            if (pageContext._providedByHook) {
                hookName = pageContext._providedByHook.hookName;
                hookFilePath = pageContext._providedByHook.hookFilePath;
            }
            else if (pageContext._urlOriginalModifiedByHook) {
                hookName = pageContext._urlOriginalModifiedByHook.hookName;
                hookFilePath = pageContext._urlOriginalModifiedByHook.hookFilePath;
            }
            if (hookName) {
                (0, utils_js_1.assert)(hookFilePath);
                (0, utils_js_1.assertUsage)(false, `The ${hookName}() hook defined by ${hookFilePath} returns a URL ${picocolors_1.default.cyan(urlOriginal)} that doesn't match any of your page routes. Make sure that the URLs returned by ${hookName}() always match the route of a page.`);
            }
            else {
                // `prerenderHookFile` is `null` when the URL was deduced by the Filesytem Routing of `.page.js` files. The `onBeforeRoute()` can override Filesystem Routing; it is therefore expected that the deduced URL may not match any page.
                (0, utils_js_1.assert)(routeResult.pageContextAddendum._routingProvidedByOnBeforeRouteHook);
                // Abort since the URL doesn't correspond to any page
                return;
            }
        }
        (0, utils_js_1.assert)(routeResult.pageContextAddendum._pageId);
        (0, utils_js_1.objectAssign)(pageContext, routeResult.pageContextAddendum);
        const { _pageId: pageId } = pageContext;
        (0, utils_js_1.objectAssign)(pageContext, await (0, loadPageFilesServerSide_js_1.loadPageFilesServerSide)(pageContext));
        let usesClientRouter;
        {
            if (pageContext._pageConfigs.length > 0) {
                const pageConfig = pageContext._pageConfigs.find((p) => p.pageId === pageId);
                (0, utils_js_1.assert)(pageConfig);
                usesClientRouter = (0, utils_js_2.getConfigValue)(pageConfig, 'clientRouting', 'boolean')?.value ?? false;
            }
            else {
                usesClientRouter = globalContext.pluginManifest.usesClientRouter;
            }
        }
        (0, utils_js_1.objectAssign)(pageContext, {
            is404: null,
            _httpRequestId: null,
            _usesClientRouter: usesClientRouter
        });
        let res;
        try {
            res = await (0, renderPageAlreadyRouted_js_1.prerenderPage)(pageContext);
        }
        catch (err) {
            assertIsNotAbort(err, picocolors_1.default.cyan(pageContext.urlOriginal));
            throw err;
        }
        const { documentHtml, pageContextSerialized } = res;
        htmlFiles.push({
            urlOriginal,
            pageContext,
            htmlString: documentHtml,
            pageContextSerialized,
            doNotCreateExtraDirectory: prerenderContext._noExtraDir,
            pageId
        });
        prerenderPageIds[pageId] = pageContext;
    })));
}
function warnContradictoryNoPrerenderList(prerenderPageIds, doNotPrerenderList) {
    Object.entries(prerenderPageIds).forEach(([pageId, pageContext]) => {
        const doNotPrerenderListEntry = doNotPrerenderList.find((p) => p.pageId === pageId);
        const { urlOriginal, _providedByHook: providedByHook } = pageContext;
        {
            const isContradictory = !!doNotPrerenderListEntry && providedByHook;
            if (!isContradictory)
                return;
        }
        const { setByConfigName, setByConfigValue, setByConfigFile } = doNotPrerenderListEntry;
        (0, utils_js_1.assertWarning)(false, `The ${providedByHook.hookName}() hook defined by ${providedByHook.hookFilePath} returns the URL ${picocolors_1.default.cyan(urlOriginal)}, while ${setByConfigFile} sets the config ${picocolors_1.default.cyan(setByConfigName)} to ${picocolors_1.default.cyan(String(setByConfigValue))}. This is contradictory: either don't set the config ${picocolors_1.default.cyan(setByConfigName)} to ${picocolors_1.default.cyan(String(setByConfigValue))} or remove the URL ${picocolors_1.default.cyan(urlOriginal)} from the list of URLs to be pre-rendered.`, { onlyOnce: true });
    });
}
function warnMissingPages(prerenderPageIds, doNotPrerenderList, renderContext, partial) {
    const isV1 = renderContext.pageConfigs.length > 0;
    const hookName = isV1 ? 'prerender' : 'onBeforePrerenderStart';
    const getPageAt = isV1 ? (pageId) => `defined at ${pageId}` : (pageId) => `\`${pageId}.page.*\``;
    renderContext.allPageIds
        .filter((pageId) => !prerenderPageIds[pageId])
        .filter((pageId) => !doNotPrerenderList.find((p) => p.pageId === pageId))
        .filter((pageId) => !(0, error_page_js_1.isErrorPage)(pageId, renderContext.pageConfigs))
        .forEach((pageId) => {
        const pageAt = getPageAt(pageId);
        (0, utils_js_1.assertWarning)(partial, `Cannot pre-render page ${pageAt} because it has a non-static route, and no ${hookName}() hook returned (an) URL(s) matching the page's route. Either use a ${hookName}() hook to pre-render the page, or use the option ${picocolors_1.default.cyan('prerender.partial')} to suppress this warning, see https://vite-plugin-ssr.com/prerender-config`, { onlyOnce: true });
    });
}
async function prerender404(htmlFiles, renderContext, prerenderContext) {
    if (!htmlFiles.find(({ urlOriginal }) => urlOriginal === '/404')) {
        let result;
        try {
            result = await (0, renderPageAlreadyRouted_js_1.prerender404Page)(renderContext, prerenderContext.pageContextInit);
        }
        catch (err) {
            assertIsNotAbort(err, 'the 404 page');
            throw err;
        }
        if (result) {
            const urlOriginal = '/404';
            const { documentHtml, pageContext } = result;
            htmlFiles.push({
                urlOriginal,
                pageContext,
                htmlString: documentHtml,
                pageContextSerialized: null,
                doNotCreateExtraDirectory: true,
                pageId: null
            });
        }
    }
}
async function writeHtmlFile({ urlOriginal, pageContext, htmlString, pageContextSerialized, doNotCreateExtraDirectory }, root, outDirClient, concurrencyLimit, onPagePrerender, logLevel) {
    (0, utils_js_1.assert)(urlOriginal.startsWith('/'));
    const writeJobs = [
        write(urlOriginal, pageContext, '.html', htmlString, root, outDirClient, doNotCreateExtraDirectory, concurrencyLimit, onPagePrerender, logLevel)
    ];
    if (pageContextSerialized !== null) {
        writeJobs.push(write(urlOriginal, pageContext, '.pageContext.json', pageContextSerialized, root, outDirClient, doNotCreateExtraDirectory, concurrencyLimit, onPagePrerender, logLevel));
    }
    await Promise.all(writeJobs);
}
function write(urlOriginal, pageContext, fileExtension, fileContent, root, outDirClient, doNotCreateExtraDirectory, concurrencyLimit, onPagePrerender, logLevel) {
    return concurrencyLimit(async () => {
        let fileUrl;
        if (fileExtension === '.html') {
            fileUrl = (0, utils_js_1.urlToFile)(urlOriginal, '.html', doNotCreateExtraDirectory);
        }
        else {
            fileUrl = (0, getPageContextRequestUrl_js_1.getPageContextRequestUrl)(urlOriginal);
        }
        (0, utils_js_1.assertPosixPath)(fileUrl);
        (0, utils_js_1.assert)(fileUrl.startsWith('/'));
        const filePathRelative = fileUrl.slice(1);
        (0, utils_js_1.assert)(!filePathRelative.startsWith('/'));
        (0, utils_js_1.assertPosixPath)(outDirClient);
        (0, utils_js_1.assertPosixPath)(filePathRelative);
        const filePath = path_1.default.posix.join(outDirClient, filePathRelative);
        if (onPagePrerender) {
            const prerenderPageContext = {};
            (0, utils_js_1.objectAssign)(prerenderPageContext, pageContext);
            (0, utils_js_1.objectAssign)(prerenderPageContext, {
                _prerenderResult: {
                    filePath,
                    fileContent
                }
            });
            await onPagePrerender(prerenderPageContext);
        }
        else {
            const { promises } = await Promise.resolve().then(() => __importStar(require('fs')));
            const { writeFile, mkdir } = promises;
            await mkdir(path_1.default.posix.dirname(filePath), { recursive: true });
            await writeFile(filePath, fileContent);
            if (logLevel === 'info') {
                (0, utils_js_1.assertPosixPath)(root);
                (0, utils_js_1.assertPosixPath)(outDirClient);
                let outDirClientRelative = path_1.default.posix.relative(root, outDirClient);
                if (!outDirClientRelative.endsWith('/')) {
                    outDirClientRelative = outDirClientRelative + '/';
                }
                console.log(`${picocolors_1.default.dim(outDirClientRelative)}${picocolors_1.default.blue(filePathRelative)}`);
            }
        }
    });
}
function normalizeOnPrerenderHookResult(prerenderResult, prerenderHookFile, hookName) {
    if (Array.isArray(prerenderResult)) {
        return prerenderResult.map(normalize);
    }
    else {
        return [normalize(prerenderResult)];
    }
    function normalize(prerenderElement) {
        if (typeof prerenderElement === 'string') {
            prerenderElement = { url: prerenderElement, pageContext: null };
        }
        const errMsg1 = `The ${hookName}() hook defined by ${prerenderHookFile} returned`;
        const errMsg2 = `${errMsg1} an invalid value`;
        const errHint = `Make sure your ${hookName}() hook returns an object ${picocolors_1.default.cyan('{ url, pageContext }')} or an array of such objects.`;
        (0, utils_js_1.assertUsage)((0, utils_js_1.isPlainObject)(prerenderElement), `${errMsg2}. ${errHint}`);
        (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(prerenderElement, 'url'), `${errMsg2}: ${picocolors_1.default.cyan('url')} is missing. ${errHint}`);
        (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(prerenderElement, 'url', 'string'), `${errMsg2}: ${picocolors_1.default.cyan('url')} should be a string (but ${picocolors_1.default.cyan(`typeof url === "${typeof prerenderElement.url}"`)}).`);
        (0, utils_js_1.assertUsage)(prerenderElement.url.startsWith('/'), `${errMsg1} a URL with an invalid value ${picocolors_1.default.cyan(prerenderElement.url)} which doesn't start with ${picocolors_1.default.cyan('/')}. Make sure each URL starts with ${picocolors_1.default.cyan('/')}.`);
        Object.keys(prerenderElement).forEach((key) => {
            (0, utils_js_1.assertUsage)(key === 'url' || key === 'pageContext', `${errMsg2}: unexpected object key ${picocolors_1.default.cyan(key)}. ${errHint}`);
        });
        if (!(0, utils_js_1.hasProp)(prerenderElement, 'pageContext')) {
            prerenderElement.pageContext = null;
        }
        else if (!(0, utils_js_1.hasProp)(prerenderElement, 'pageContext', 'null')) {
            (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(prerenderElement, 'pageContext', 'object'), `${errMsg1} an invalid ${picocolors_1.default.cyan('pageContext')} value: make sure ${picocolors_1.default.cyan('pageContext')} is an object.`);
            (0, utils_js_1.assertUsage)((0, utils_js_1.isPlainObject)(prerenderElement.pageContext), `${errMsg1} an invalid ${picocolors_1.default.cyan('pageContext')} object: make sure ${picocolors_1.default.cyan('pageContext')} is a plain JavaScript object.`);
        }
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(prerenderElement, 'pageContext', 'object') || (0, utils_js_1.hasProp)(prerenderElement, 'pageContext', 'null'));
        return prerenderElement;
    }
}
// TODO/v1-release: remove
function checkOutdatedOptions(options) {
    (0, utils_js_1.assertUsage)(options.root === undefined, 'Option `prerender({ root })` deprecated: set `prerender({ viteConfig: { root }})` instead.', { showStackTrace: true });
    (0, utils_js_1.assertUsage)(options.configFile === undefined, 'Option `prerender({ configFile })` deprecated: set `prerender({ viteConfig: { configFile }})` instead.', { showStackTrace: true });
    ['noExtraDir', 'partial', 'parallel'].forEach((prop) => {
        (0, utils_js_1.assertUsage)(options[prop] === undefined, `[prerender()] Option ${picocolors_1.default.cyan(prop)} is deprecated. Define ${picocolors_1.default.cyan(prop)} in vite.config.js instead. See https://vite-plugin-ssr.com/prerender-config`, { showStackTrace: true });
    });
    ['base', 'outDir'].forEach((prop) => {
        (0, utils_js_1.assertWarning)(options[prop] === undefined, `[prerender()] Option ${picocolors_1.default.cyan(prop)} is outdated and has no effect (vite-plugin-ssr now automatically determines ${picocolors_1.default.cyan(prop)})`, {
            showStackTrace: true,
            onlyOnce: true
        });
    });
}
async function disableReactStreaming() {
    let mod;
    try {
        mod = await Promise.resolve().then(() => __importStar(require('react-streaming/server')));
    }
    catch {
        return;
    }
    const { disable } = mod;
    disable();
}
function assertLoadedConfig(viteConfig, options) {
    if (viteConfig.plugins.some((p) => p.name.startsWith('vite-plugin-ssr'))) {
        return;
    }
    const { configFile } = viteConfig;
    if (configFile) {
        (0, utils_js_1.assertUsage)(false, `${configFile} doesn't install the vite-plugin-ssr plugin`);
    }
    else {
        if (!options.viteConfig) {
            (0, utils_js_1.assertUsage)(false, `[prerender()] No vite.config.js file found at ${process.cwd()}. Use the option ${picocolors_1.default.cyan('prerender({ viteConfig })')}.`, { showStackTrace: true });
        }
        else {
            (0, utils_js_1.assertUsage)(false, `[prerender()] The Vite config ${picocolors_1.default.cyan('prerender({ viteConfig })')} is missing the vite-plugin-ssr plugin.`, {
                showStackTrace: true
            });
        }
    }
}
function isSameUrl(url1, url2) {
    return normalizeUrl(url1) === normalizeUrl(url2);
}
function normalizeUrl(url) {
    return '/' + url.split('/').filter(Boolean).join('/');
}
function prerenderForceExit() {
    // Force exit; known situations where pre-rendering is hanging:
    //  - https://github.com/brillout/vite-plugin-ssr/discussions/774#discussioncomment-5584551
    //  - https://github.com/brillout/vite-plugin-ssr/issues/807#issuecomment-1519010902
    process.exit(0);
    /* I guess there is no need to tell the user about it? Let's see if a user complains.
     * I don't known whether there is a way to call process.exit(0) only if needed, thus I'm not sure if there is a way to conditionally show a assertInfo().
    assertInfo(false, "Pre-rendering was forced exit. (Didn't gracefully exit because the event queue isn't empty. This is usally fine, see ...", { onlyOnce: false })
    */
}
exports.prerenderForceExit = prerenderForceExit;
function assertIsNotAbort(err, urlOr404) {
    if (!(0, abort_js_1.isAbortError)(err))
        return;
    const pageContextAbort = err._pageContextAbort;
    (0, utils_js_1.assertUsage)(false, `${picocolors_1.default.cyan(pageContextAbort._abortCall)} intercepted while pre-rendering ${urlOr404} but ${picocolors_1.default.cyan(pageContextAbort._abortCaller)} isn't supported for pre-rendered pages`);
}
