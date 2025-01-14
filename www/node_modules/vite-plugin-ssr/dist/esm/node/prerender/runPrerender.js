export { prerenderFromAPI };
export { prerenderFromCLI };
export { prerenderFromAutoFullBuild };
export { prerenderForceExit };
import '../runtime/page-files/setup.js';
import path from 'path';
import { route } from '../../shared/route/index.js';
import { assert, assertUsage, assertWarning, hasProp, projectInfo, objectAssign, isObjectWithKeys, isCallable, getOutDirs_prerender, hasPropertyGetter, assertPosixPath, urlToFile, executeHook, isPlainObject, setNodeEnvToProduction } from './utils.js';
import { pLimit } from '../../utils/pLimit.js';
import { prerenderPage, prerender404Page, getRenderContext, getPageContextInitEnhanced } from '../runtime/renderPage/renderPageAlreadyRouted.js';
import pc from '@brillout/picocolors';
import { cpus } from 'os';
import { getGlobalContext, initGlobalContext } from '../runtime/globalContext.js';
import { resolveConfig } from 'vite';
import { getConfigVps } from '../shared/getConfigVps.js';
import { getPageFilesServerSide } from '../../shared/getPageFiles.js';
import { getPageContextRequestUrl } from '../../shared/getPageContextRequestUrl.js';
import { getUrlFromRouteString } from '../../shared/route/resolveRouteString.js';
import { getConfigDefinedAtInfo, getConfigValue } from '../../shared/page-configs/utils.js';
import { loadPageCode } from '../../shared/page-configs/loadPageCode.js';
import { isErrorPage } from '../../shared/error-page.js';
import { addUrlComputedProps } from '../../shared/addUrlComputedProps.js';
import { assertPathIsFilesystemAbsolute } from '../../utils/assertPathIsFilesystemAbsolute.js';
import { isAbortError } from '../../shared/route/abort.js';
import { loadPageFilesServerSide } from '../runtime/renderPage/loadPageFilesServerSide.js';
import { assertHookFn } from '../../shared/hooks/getHook.js';
async function prerenderFromAPI(options = {}) {
    await runPrerender(options, 'prerender()');
}
async function prerenderFromCLI(options) {
    await runPrerender(options, '$ vite-plugin-ssr prerender');
}
async function prerenderFromAutoFullBuild(options) {
    await runPrerender(options, null);
}
async function runPrerender(options, manuallyTriggered) {
    checkOutdatedOptions(options);
    const logLevel = !!options.onPagePrerender ? 'warn' : 'info';
    if (logLevel === 'info') {
        console.log(`${pc.cyan(`vite-plugin-ssr v${projectInfo.projectVersion}`)} ${pc.green('pre-rendering HTML...')}`);
    }
    setNodeEnvToProduction();
    await disableReactStreaming();
    const viteConfig = await resolveConfig(options.viteConfig || {}, 'vite-plugin-ssr pre-rendering', 'production');
    assertLoadedConfig(viteConfig, options);
    const configVps = await getConfigVps(viteConfig);
    const { outDirClient, outDirRoot } = getOutDirs_prerender(viteConfig);
    const { root } = viteConfig;
    const prerenderConfig = configVps.prerender;
    if (!prerenderConfig) {
        assert(manuallyTriggered);
        assertWarning(prerenderConfig, `You're executing ${pc.cyan(manuallyTriggered)} but the config ${pc.cyan('prerender')} isn't set to true`, {
            onlyOnce: true
        });
    }
    const { partial = false, noExtraDir = false, parallel = true } = prerenderConfig || {};
    const concurrencyLimit = pLimit(parallel === false || parallel === 0 ? 1 : parallel === true || parallel === undefined ? cpus().length : parallel);
    assertPathIsFilesystemAbsolute(outDirRoot); // Needed for loadServerBuild(outDir) of @brillout/vite-plugin-import-build
    await initGlobalContext(true, outDirRoot);
    const renderContext = await getRenderContext();
    renderContext.pageFilesAll.forEach(assertExportNames);
    const prerenderContext = {};
    objectAssign(prerenderContext, {
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
        console.log(`${pc.green(`✓`)} ${htmlFiles.length} HTML documents pre-rendered.`);
    }
    await Promise.all(htmlFiles.map((htmlFile) => writeHtmlFile(htmlFile, root, outDirClient, concurrencyLimit, options.onPagePrerender, logLevel)));
    warnMissingPages(prerenderPageIds, doNotPrerenderList, renderContext, partial);
}
async function collectDoNoPrerenderList(renderContext, doNotPrerenderList, concurrencyLimit) {
    renderContext.pageConfigs.forEach((pageConfig) => {
        const configName = 'prerender';
        const configValue = getConfigValue(pageConfig, configName, 'boolean');
        if (configValue?.value === false) {
            const definedAtInfo = getConfigDefinedAtInfo(pageConfig, configName);
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
        assertUsage(p.fileType !== '.page.client', `${p.filePath} (which is a \`.page.client.js\` file) has \`export { doNotPrerender }\` but it is only allowed in \`.page.server.js\` or \`.page.js\` files`);
        return true;
    })
        .map((p) => concurrencyLimit(async () => {
        assert(p.loadFile);
        await p.loadFile();
    })));
    renderContext.allPageIds.forEach((pageId) => {
        const pageFilesServerSide = getPageFilesServerSide(renderContext.pageFilesAll, pageId);
        for (const p of pageFilesServerSide) {
            if (!p.exportNames?.includes('doNotPrerender'))
                continue;
            const { fileExports } = p;
            assert(fileExports);
            assert(hasProp(fileExports, 'doNotPrerender'));
            const { doNotPrerender } = fileExports;
            assertUsage(doNotPrerender === true || doNotPrerender === false, `The \`export { doNotPrerender }\` value of ${p.filePath} should be \`true\` or \`false\``);
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
    assert(exportNames || fileType === '.page.route' || fileType === '.css', pageFile.filePath);
}
async function callOnBeforePrerenderStartHooks(prerenderContext, renderContext, concurrencyLimit) {
    const onBeforePrerenderStartHooks = [];
    // V1 design
    await Promise.all(renderContext.pageConfigs.map((pageConfig) => concurrencyLimit(async () => {
        const hookName = 'onBeforePrerenderStart';
        const pageConfigLoaded = await loadPageCode(pageConfig, false);
        const configValue = getConfigValue(pageConfigLoaded, hookName);
        if (!configValue)
            return;
        const hookFn = configValue.value;
        const definedAtInfo = getConfigDefinedAtInfo(pageConfigLoaded, hookName);
        const hookFilePath = definedAtInfo.filePath;
        assert(hookFilePath);
        assertHookFn(hookFn, { hookName, hookFilePath });
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
        assertUsage(p.fileType === '.page.server', `${p.filePath} (which is a \`${p.fileType}.js\` file) has \`export { prerender }\` but it is only allowed in \`.page.server.js\` files`);
        return true;
    })
        .map((p) => concurrencyLimit(async () => {
        await p.loadFile?.();
        const hookFn = p.fileExports?.prerender;
        if (!hookFn)
            return;
        assertUsage(isCallable(hookFn), `\`export { prerender }\` of ${p.filePath} should be a function.`);
        const hookFilePath = p.filePath;
        assert(hookFilePath);
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
                    assert(pageContextFound._providedByHook);
                    const providedTwice = hookFilePath === pageContextFound._providedByHook.hookFilePath
                        ? `twice by the ${hookName}() hook (${hookFilePath})`
                        : `twice: by the ${hookName}() hook (${hookFilePath}) as well as by the hook ${pageContextFound._providedByHook.hookFilePath}() (${pageContextFound._providedByHook.hookName})`;
                    assertUsage(false, `URL ${pc.cyan(url)} provided ${providedTwice}. Make sure to provide the URL only once instead.`);
                }
            }
            const pageContextNew = createPageContext(url, renderContext, prerenderContext);
            objectAssign(pageContextNew, {
                _providedByHook: {
                    hookFilePath,
                    hookName
                }
            });
            prerenderContext.pageContexts.push(pageContextNew);
            if (pageContext) {
                objectAssign(pageContextNew, {
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
            assert(pageRoute.routeType === 'FUNCTION');
            return;
        }
        else {
            const url = getUrlFromRouteString(pageRoute.routeString);
            if (!url) {
                // Abort since no URL can be deduced from a parameterized Route String
                return;
            }
            urlOriginal = url;
        }
        assert(urlOriginal.startsWith('/'));
        // Already included in a onBeforePrerenderStart() hook
        if (prerenderContext.pageContexts.find((pageContext) => isSameUrl(pageContext.urlOriginal, urlOriginal))) {
            return;
        }
        const routeParams = {};
        const pageContext = createPageContext(urlOriginal, renderContext, prerenderContext);
        objectAssign(pageContext, {
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
        objectAssign(pageContext, await loadPageFilesServerSide(pageContext));
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
        const pageContextInitEnhanced = getPageContextInitEnhanced(pageContextInit, renderContext, {
            // We set `enumerable` to `false` to avoid computed URL properties from being iterated & copied in a onPrerenderStart() hook, e.g. /examples/i18n/
            urlComputedPropsNonEnumerable: true
        });
        objectAssign(pageContext, pageContextInitEnhanced);
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
            assert(!configValueSource.isComputed);
            const hookFilePath = configValueSource.definedAtInfo.filePath;
            assert(hookFn);
            assert(hookFilePath);
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
            assertUsage(p.fileType !== '.page.client', `${p.filePath} (which is a \`.page.client.js\` file) has \`export { onBeforePrerender }\` but it is only allowed in \`.page.server.js\` or \`.page.js\` files`);
            assertUsage(p.isDefaultPageFile, `${p.filePath} has \`export { onBeforePrerender }\` but it is only allowed in \`_defaut.page.\` files`);
            return true;
        });
        if (pageFilesWithOnBeforePrerenderHook.length === 0) {
            return;
        }
        assertUsage(pageFilesWithOnBeforePrerenderHook.length === 1, 'There can be only one `onBeforePrerender()` hook. If you need to be able to define several, open a new GitHub issue.');
        await Promise.all(pageFilesWithOnBeforePrerenderHook.map((p) => p.loadFile?.()));
        const hooks = pageFilesWithOnBeforePrerenderHook.map((p) => {
            assert(p.fileExports);
            const { onBeforePrerender } = p.fileExports;
            assert(onBeforePrerender);
            const hookFilePath = p.filePath;
            return { hookFilePath, onBeforePrerender };
        });
        assert(hooks.length === 1);
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
    assertUsage(isCallable(hookFn), `${msgPrefix} should be a function.`);
    prerenderContext.pageContexts.forEach((pageContext) => {
        Object.defineProperty(pageContext, 'url', {
            // TODO/v1-release: remove warning
            get() {
                assertWarning(false, msgPrefix +
                    ' uses pageContext.url but it should use pageContext.urlOriginal instead, see https://vite-plugin-ssr.com/migration/0.4.23', { showStackTrace: true, onlyOnce: true });
                return pageContext.urlOriginal;
            },
            enumerable: false,
            configurable: true
        });
        assert(hasPropertyGetter(pageContext, 'url'));
        assert(pageContext.urlOriginal);
        pageContext._urlOriginalBeforeHook = pageContext.urlOriginal;
    });
    const docLink = 'https://vite-plugin-ssr.com/i18n#pre-rendering';
    let result = await executeHook(() => hookFn({
        pageContexts: prerenderContext.pageContexts,
        // TODO/v1-release: remove warning
        get prerenderPageContexts() {
            assertWarning(false, `prerenderPageContexts has been renamed pageContexts, see ${docLink}`, {
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
    const rightUsage = `${errPrefix} should return ${pc.cyan('null')}, ${pc.cyan('undefined')}, or ${pc.cyan('{ prerenderContext: { pageContexts } }')}`;
    // TODO/v1-release: remove
    if (hasProp(result, 'globalContext')) {
        assertUsage(isObjectWithKeys(result, ['globalContext']) &&
            hasProp(result, 'globalContext', 'object') &&
            hasProp(result.globalContext, 'prerenderPageContexts', 'array'), rightUsage);
        assertWarning(false, `${errPrefix} returns ${pc.cyan('{ globalContext: { prerenderPageContexts } }')} but the return value has been renamed to ${pc.cyan('{ prerenderContext: { pageContexts } }')}, see ${docLink}`, { onlyOnce: true });
        result = {
            prerenderContext: {
                pageContexts: result.globalContext.prerenderPageContexts
            }
        };
    }
    assertUsage(isObjectWithKeys(result, ['prerenderContext']) &&
        hasProp(result, 'prerenderContext', 'object') &&
        hasProp(result.prerenderContext, 'pageContexts', 'array'), rightUsage);
    prerenderContext.pageContexts = result.prerenderContext.pageContexts;
    prerenderContext.pageContexts.forEach((pageContext) => {
        // TODO/v1-release: remove
        if (!hasPropertyGetter(pageContext, 'url') && pageContext.url) {
            assertWarning(false, msgPrefix +
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
        addUrlComputedProps(pageContext);
    });
}
async function routeAndPrerender(prerenderContext, htmlFiles, prerenderPageIds, concurrencyLimit) {
    const globalContext = getGlobalContext();
    assert(globalContext.isPrerendering);
    // Route all URLs
    await Promise.all(prerenderContext.pageContexts.map((pageContext) => concurrencyLimit(async () => {
        const { urlOriginal } = pageContext;
        assert(urlOriginal);
        const routeResult = await route(pageContext);
        assert(hasProp(routeResult.pageContextAddendum, '_pageId', 'null') ||
            hasProp(routeResult.pageContextAddendum, '_pageId', 'string'));
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
                assert(hookFilePath);
                assertUsage(false, `The ${hookName}() hook defined by ${hookFilePath} returns a URL ${pc.cyan(urlOriginal)} that doesn't match any of your page routes. Make sure that the URLs returned by ${hookName}() always match the route of a page.`);
            }
            else {
                // `prerenderHookFile` is `null` when the URL was deduced by the Filesytem Routing of `.page.js` files. The `onBeforeRoute()` can override Filesystem Routing; it is therefore expected that the deduced URL may not match any page.
                assert(routeResult.pageContextAddendum._routingProvidedByOnBeforeRouteHook);
                // Abort since the URL doesn't correspond to any page
                return;
            }
        }
        assert(routeResult.pageContextAddendum._pageId);
        objectAssign(pageContext, routeResult.pageContextAddendum);
        const { _pageId: pageId } = pageContext;
        objectAssign(pageContext, await loadPageFilesServerSide(pageContext));
        let usesClientRouter;
        {
            if (pageContext._pageConfigs.length > 0) {
                const pageConfig = pageContext._pageConfigs.find((p) => p.pageId === pageId);
                assert(pageConfig);
                usesClientRouter = getConfigValue(pageConfig, 'clientRouting', 'boolean')?.value ?? false;
            }
            else {
                usesClientRouter = globalContext.pluginManifest.usesClientRouter;
            }
        }
        objectAssign(pageContext, {
            is404: null,
            _httpRequestId: null,
            _usesClientRouter: usesClientRouter
        });
        let res;
        try {
            res = await prerenderPage(pageContext);
        }
        catch (err) {
            assertIsNotAbort(err, pc.cyan(pageContext.urlOriginal));
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
        assertWarning(false, `The ${providedByHook.hookName}() hook defined by ${providedByHook.hookFilePath} returns the URL ${pc.cyan(urlOriginal)}, while ${setByConfigFile} sets the config ${pc.cyan(setByConfigName)} to ${pc.cyan(String(setByConfigValue))}. This is contradictory: either don't set the config ${pc.cyan(setByConfigName)} to ${pc.cyan(String(setByConfigValue))} or remove the URL ${pc.cyan(urlOriginal)} from the list of URLs to be pre-rendered.`, { onlyOnce: true });
    });
}
function warnMissingPages(prerenderPageIds, doNotPrerenderList, renderContext, partial) {
    const isV1 = renderContext.pageConfigs.length > 0;
    const hookName = isV1 ? 'prerender' : 'onBeforePrerenderStart';
    const getPageAt = isV1 ? (pageId) => `defined at ${pageId}` : (pageId) => `\`${pageId}.page.*\``;
    renderContext.allPageIds
        .filter((pageId) => !prerenderPageIds[pageId])
        .filter((pageId) => !doNotPrerenderList.find((p) => p.pageId === pageId))
        .filter((pageId) => !isErrorPage(pageId, renderContext.pageConfigs))
        .forEach((pageId) => {
        const pageAt = getPageAt(pageId);
        assertWarning(partial, `Cannot pre-render page ${pageAt} because it has a non-static route, and no ${hookName}() hook returned (an) URL(s) matching the page's route. Either use a ${hookName}() hook to pre-render the page, or use the option ${pc.cyan('prerender.partial')} to suppress this warning, see https://vite-plugin-ssr.com/prerender-config`, { onlyOnce: true });
    });
}
async function prerender404(htmlFiles, renderContext, prerenderContext) {
    if (!htmlFiles.find(({ urlOriginal }) => urlOriginal === '/404')) {
        let result;
        try {
            result = await prerender404Page(renderContext, prerenderContext.pageContextInit);
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
    assert(urlOriginal.startsWith('/'));
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
            fileUrl = urlToFile(urlOriginal, '.html', doNotCreateExtraDirectory);
        }
        else {
            fileUrl = getPageContextRequestUrl(urlOriginal);
        }
        assertPosixPath(fileUrl);
        assert(fileUrl.startsWith('/'));
        const filePathRelative = fileUrl.slice(1);
        assert(!filePathRelative.startsWith('/'));
        assertPosixPath(outDirClient);
        assertPosixPath(filePathRelative);
        const filePath = path.posix.join(outDirClient, filePathRelative);
        if (onPagePrerender) {
            const prerenderPageContext = {};
            objectAssign(prerenderPageContext, pageContext);
            objectAssign(prerenderPageContext, {
                _prerenderResult: {
                    filePath,
                    fileContent
                }
            });
            await onPagePrerender(prerenderPageContext);
        }
        else {
            const { promises } = await import('fs');
            const { writeFile, mkdir } = promises;
            await mkdir(path.posix.dirname(filePath), { recursive: true });
            await writeFile(filePath, fileContent);
            if (logLevel === 'info') {
                assertPosixPath(root);
                assertPosixPath(outDirClient);
                let outDirClientRelative = path.posix.relative(root, outDirClient);
                if (!outDirClientRelative.endsWith('/')) {
                    outDirClientRelative = outDirClientRelative + '/';
                }
                console.log(`${pc.dim(outDirClientRelative)}${pc.blue(filePathRelative)}`);
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
        const errHint = `Make sure your ${hookName}() hook returns an object ${pc.cyan('{ url, pageContext }')} or an array of such objects.`;
        assertUsage(isPlainObject(prerenderElement), `${errMsg2}. ${errHint}`);
        assertUsage(hasProp(prerenderElement, 'url'), `${errMsg2}: ${pc.cyan('url')} is missing. ${errHint}`);
        assertUsage(hasProp(prerenderElement, 'url', 'string'), `${errMsg2}: ${pc.cyan('url')} should be a string (but ${pc.cyan(`typeof url === "${typeof prerenderElement.url}"`)}).`);
        assertUsage(prerenderElement.url.startsWith('/'), `${errMsg1} a URL with an invalid value ${pc.cyan(prerenderElement.url)} which doesn't start with ${pc.cyan('/')}. Make sure each URL starts with ${pc.cyan('/')}.`);
        Object.keys(prerenderElement).forEach((key) => {
            assertUsage(key === 'url' || key === 'pageContext', `${errMsg2}: unexpected object key ${pc.cyan(key)}. ${errHint}`);
        });
        if (!hasProp(prerenderElement, 'pageContext')) {
            prerenderElement.pageContext = null;
        }
        else if (!hasProp(prerenderElement, 'pageContext', 'null')) {
            assertUsage(hasProp(prerenderElement, 'pageContext', 'object'), `${errMsg1} an invalid ${pc.cyan('pageContext')} value: make sure ${pc.cyan('pageContext')} is an object.`);
            assertUsage(isPlainObject(prerenderElement.pageContext), `${errMsg1} an invalid ${pc.cyan('pageContext')} object: make sure ${pc.cyan('pageContext')} is a plain JavaScript object.`);
        }
        assert(hasProp(prerenderElement, 'pageContext', 'object') || hasProp(prerenderElement, 'pageContext', 'null'));
        return prerenderElement;
    }
}
// TODO/v1-release: remove
function checkOutdatedOptions(options) {
    assertUsage(options.root === undefined, 'Option `prerender({ root })` deprecated: set `prerender({ viteConfig: { root }})` instead.', { showStackTrace: true });
    assertUsage(options.configFile === undefined, 'Option `prerender({ configFile })` deprecated: set `prerender({ viteConfig: { configFile }})` instead.', { showStackTrace: true });
    ['noExtraDir', 'partial', 'parallel'].forEach((prop) => {
        assertUsage(options[prop] === undefined, `[prerender()] Option ${pc.cyan(prop)} is deprecated. Define ${pc.cyan(prop)} in vite.config.js instead. See https://vite-plugin-ssr.com/prerender-config`, { showStackTrace: true });
    });
    ['base', 'outDir'].forEach((prop) => {
        assertWarning(options[prop] === undefined, `[prerender()] Option ${pc.cyan(prop)} is outdated and has no effect (vite-plugin-ssr now automatically determines ${pc.cyan(prop)})`, {
            showStackTrace: true,
            onlyOnce: true
        });
    });
}
async function disableReactStreaming() {
    let mod;
    try {
        mod = await import('react-streaming/server');
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
        assertUsage(false, `${configFile} doesn't install the vite-plugin-ssr plugin`);
    }
    else {
        if (!options.viteConfig) {
            assertUsage(false, `[prerender()] No vite.config.js file found at ${process.cwd()}. Use the option ${pc.cyan('prerender({ viteConfig })')}.`, { showStackTrace: true });
        }
        else {
            assertUsage(false, `[prerender()] The Vite config ${pc.cyan('prerender({ viteConfig })')} is missing the vite-plugin-ssr plugin.`, {
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
function assertIsNotAbort(err, urlOr404) {
    if (!isAbortError(err))
        return;
    const pageContextAbort = err._pageContextAbort;
    assertUsage(false, `${pc.cyan(pageContextAbort._abortCall)} intercepted while pre-rendering ${urlOr404} but ${pc.cyan(pageContextAbort._abortCaller)} isn't supported for pre-rendered pages`);
}
