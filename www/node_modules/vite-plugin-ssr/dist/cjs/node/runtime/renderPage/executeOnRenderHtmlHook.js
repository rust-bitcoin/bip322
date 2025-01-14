"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeOnRenderHtmlHook = void 0;
const renderHtml_js_1 = require("../html/renderHtml.js");
const getHook_js_1 = require("../../../shared/hooks/getHook.js");
const utils_js_1 = require("../utils.js");
const stream_js_1 = require("../html/stream.js");
const assertPageContextProvidedByUser_js_1 = require("../../../shared/assertPageContextProvidedByUser.js");
const preparePageContextForUserConsumptionServerSide_js_1 = require("./preparePageContextForUserConsumptionServerSide.js");
const assertHookReturnedObject_js_1 = require("../../../shared/assertHookReturnedObject.js");
const loggerRuntime_js_1 = require("./loggerRuntime.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function executeOnRenderHtmlHook(pageContext) {
    const hookFound = getRenderHook(pageContext);
    const { renderHook, hookFn } = hookFound;
    (0, utils_js_1.objectAssign)(pageContext, { _renderHook: renderHook });
    (0, preparePageContextForUserConsumptionServerSide_js_1.preparePageContextForUserConsumptionServerSide)(pageContext);
    const hookReturnValue = await (0, utils_js_1.executeHook)(() => hookFn(pageContext), renderHook.hookName, renderHook.hookFilePath);
    const { documentHtml, pageContextProvidedByRenderHook, pageContextPromise, injectFilter } = processHookReturnValue(hookReturnValue, renderHook);
    Object.assign(pageContext, pageContextProvidedByRenderHook);
    (0, utils_js_1.objectAssign)(pageContext, { _pageContextPromise: pageContextPromise });
    if (documentHtml === null || documentHtml === undefined) {
        return { htmlRender: null, renderHook };
    }
    const onErrorWhileStreaming = (err) => {
        // Should the stream inject the following?
        // ```
        // <script>console.error("An error occurred on the server while streaming the app to HTML. Check the server logs for more information.")</script>
        // ```
        (0, loggerRuntime_js_1.logRuntimeError)(err, pageContext._httpRequestId);
        if (!pageContext.errorWhileRendering) {
            pageContext.errorWhileRendering = err;
        }
    };
    const htmlRender = await (0, renderHtml_js_1.renderDocumentHtml)(documentHtml, pageContext, onErrorWhileStreaming, injectFilter);
    (0, utils_js_1.assert)(typeof htmlRender === 'string' || (0, stream_js_1.isStream)(htmlRender));
    return { htmlRender, renderHook };
}
exports.executeOnRenderHtmlHook = executeOnRenderHtmlHook;
function getRenderHook(pageContext) {
    let hookFound;
    {
        let hook;
        let hookName = undefined;
        hook = (0, getHook_js_1.getHook)(pageContext, 'onRenderHtml');
        if (hook) {
            hookName = 'onRenderHtml';
        }
        else {
            hook = (0, getHook_js_1.getHook)(pageContext, 'render');
            if (hook) {
                hookName = 'render';
            }
        }
        if (hook) {
            (0, utils_js_1.assert)(hookName);
            const { hookFilePath, hookFn } = hook;
            hookFound = {
                hookFn,
                renderHook: { hookFilePath, hookName }
            };
        }
    }
    if (!hookFound) {
        const hookName = pageContext._pageConfigs.length > 0 ? 'onRenderHtml' : 'render';
        (0, utils_js_1.assertUsage)(false, [
            `No ${hookName}() hook found, see https://vite-plugin-ssr.com/${hookName}`
            /*
          'See https://vite-plugin-ssr.com/render-modes for more information.',
          [
            // 'Loaded config files (none of them define the onRenderHtml() hook):',
            'Loaded server-side page files (none of them `export { render }`):',
            ...pageContext._pageFilePathsLoaded.map((f, i) => ` (${i + 1}): ${f}`)
          ].join('\n')
          */
        ].join(' '));
    }
    return hookFound;
}
function processHookReturnValue(hookReturnValue, renderHook) {
    let documentHtml = null;
    let pageContextPromise = null;
    let pageContextProvidedByRenderHook = null;
    let injectFilter = null;
    const ret = () => ({ documentHtml, pageContextProvidedByRenderHook, pageContextPromise, injectFilter });
    if (hookReturnValue === null)
        return ret();
    if ((0, renderHtml_js_1.isDocumentHtml)(hookReturnValue)) {
        documentHtml = hookReturnValue;
        return ret();
    }
    const errPrefix = `The ${renderHook.hookName}() hook defined at ${renderHook.hookFilePath}`;
    const errSuffix = `a string generated with the ${picocolors_1.default.cyan('escapeInject`<html>...</html>`')} template tag or a string returned by ${picocolors_1.default.cyan('dangerouslySkipEscape()')}, see https://vite-plugin-ssr.com/escapeInject`;
    if (typeof hookReturnValue === 'string') {
        (0, utils_js_1.assertWarning)(false, [errPrefix, 'returned a plain JavaScript string which is dangerous: it should instead return', errSuffix].join(' '), { onlyOnce: true });
        hookReturnValue = (0, renderHtml_js_1.dangerouslySkipEscape)(hookReturnValue);
    }
    (0, utils_js_1.assertUsage)((0, utils_js_1.isObject)(hookReturnValue), [
        errPrefix,
        `should return ${picocolors_1.default.cyan('null')}, the value ${picocolors_1.default.cyan('documentHtml')}, or an object ${picocolors_1.default.cyan('{ documentHtml, pageContext }')} where ${picocolors_1.default.cyan('pageContext')} is ${picocolors_1.default.cyan('undefined')} or an object holding additional pageContext values, and where ${picocolors_1.default.cyan('documentHtml')} is`,
        errSuffix
    ].join(' '));
    (0, assertHookReturnedObject_js_1.assertHookReturnedObject)(hookReturnValue, ['documentHtml', 'pageContext', 'injectFilter'], errPrefix);
    if (hookReturnValue.injectFilter) {
        (0, utils_js_1.assertUsage)((0, utils_js_1.isCallable)(hookReturnValue.injectFilter), 'injectFilter should be a function');
        injectFilter = hookReturnValue.injectFilter;
    }
    if (hookReturnValue.documentHtml) {
        let val = hookReturnValue.documentHtml;
        const errBegin = `${errPrefix} returned ${picocolors_1.default.cyan('{ documentHtml }')}, but ${picocolors_1.default.cyan('documentHtml')}`;
        if (typeof val === 'string') {
            (0, utils_js_1.assertWarning)(false, [
                errBegin,
                `is a plain JavaScript string which is dangerous: ${picocolors_1.default.cyan('documentHtml')} should be`,
                errSuffix
            ].join(' '), { onlyOnce: true });
            val = (0, renderHtml_js_1.dangerouslySkipEscape)(val);
        }
        (0, utils_js_1.assertUsage)((0, renderHtml_js_1.isDocumentHtml)(val), [errBegin, 'should be', errSuffix].join(' '));
        documentHtml = val;
    }
    if (hookReturnValue.pageContext) {
        const val = hookReturnValue.pageContext;
        const errBegin = `${errPrefix} returned ${picocolors_1.default.cyan('{ pageContext }')}, but ${picocolors_1.default.cyan('pageContext')}`;
        if ((0, utils_js_1.isPromise)(val) || (0, utils_js_1.isCallable)(val)) {
            (0, utils_js_1.assertWarning)(!(0, utils_js_1.isPromise)(val), `${errBegin} is a promise which is deprecated in favor of async functions, see https://vite-plugin-ssr.com/stream#initial-data-after-stream-end`, { onlyOnce: true });
            pageContextPromise = val;
        }
        else {
            (0, utils_js_1.assertUsage)((0, utils_js_1.isObject)(val), `${errBegin} should be an object or an async function, see https://vite-plugin-ssr.com/stream#initial-data-after-stream-end`);
            (0, assertPageContextProvidedByUser_js_1.assertPageContextProvidedByUser)(val, renderHook);
            pageContextProvidedByRenderHook = val;
        }
    }
    return ret();
}
