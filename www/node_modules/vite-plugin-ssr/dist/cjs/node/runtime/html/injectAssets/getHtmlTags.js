"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtmlTags = void 0;
const utils_js_1 = require("../../utils.js");
const serializePageContextClientSide_js_1 = require("../serializePageContextClientSide.js");
const sanitizeJson_js_1 = require("./sanitizeJson.js");
const inferHtmlTags_js_1 = require("./inferHtmlTags.js");
const getViteDevScripts_js_1 = require("./getViteDevScripts.js");
const mergeScriptTags_js_1 = require("./mergeScriptTags.js");
const globalContext_js_1 = require("../../globalContext.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function getHtmlTags(pageContext, injectToStream, injectFilter) {
    (0, utils_js_1.assert)([true, false].includes(pageContext._isHtmlOnly));
    const isHtmlOnly = pageContext._isHtmlOnly;
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    const { isProduction } = globalContext;
    const injectJavaScriptDuringStream = !pageContext._pageContextPromise && !!injectToStream;
    const pageAssets = await pageContext.__getPageAssets();
    const stamp = Symbol('injectFilterEntryStamp');
    const getInject = (asset) => {
        if (!isProduction) {
            return 'HTML_BEGIN';
        }
        if (asset.assetType === 'style' || asset.assetType === 'font') {
            return 'HTML_BEGIN';
        }
        if (asset.assetType === 'script') {
            return 'HTML_END';
        }
        return false;
    };
    const injectFilterEntries = pageAssets
        .filter((asset) => {
        if (asset.isEntry && asset.assetType === 'script') {
            // We could in principle allow the user to change the position of <script> but we don't because of `getMergedScriptTag()`
            return false;
        }
        if (isHtmlOnly && asset.assetType === 'script') {
            return false;
        }
        return true;
    })
        .map((asset) => {
        const inject = getInject(asset);
        const entry = {
            ...asset,
            inject,
            // @ts-ignore
            [stamp]: true
        };
        return entry;
    });
    assertInjectFilterEntries(injectFilterEntries, stamp);
    if (injectFilter && isProduction) {
        Object.seal(injectFilterEntries); // `Object.seal()` instead of `Object.freeze()` to allow the user to `assets.sort()`
        Object.values(injectFilterEntries).forEach((entry) => (0, utils_js_1.freezePartial)(entry, { inject: (val) => val === false || val === 'HTML_BEGIN' || val === 'HTML_END' }));
        const res = injectFilter(injectFilterEntries);
        (0, utils_js_1.assertUsage)(res === undefined, 'Wrong injectFilter() usage, see https://vite-plugin-ssr.com/injectFilter');
        assertInjectFilterUsage(injectFilterEntries, stamp);
        injectFilterEntries.forEach((a) => {
            /*
            if (a.assetType === 'script' && a.isEntry) {
              assertUsage(a.inject, `[injectFilter()] ${a.src} needs to be injected`)
            }
            */
            if (a.assetType === 'style' && a.isEntry) {
                // In development, Vite automatically inject styles, but we still inject `<link rel="stylesheet" type="text/css" href="${src}">` tags in order to avoid FOUC (flash of unstyled content).
                //  - https://github.com/vitejs/vite/issues/2282
                //  - https://github.com/brillout/vite-plugin-ssr/issues/261
                (0, utils_js_1.assertWarning)(a.inject, `[injectFilter()] We recommend against not injecting ${a.src}`, {
                    onlyOnce: true
                });
            }
            if (!isHtmlOnly && a.assetType === 'script') {
                (0, utils_js_1.assertWarning)(a.inject, `[injectFilter()] We recommend against not preloading JavaScript (${a.src})`, {
                    onlyOnce: true
                });
            }
        });
    }
    const htmlTags = [];
    // Non-JavaScript
    for (const asset of injectFilterEntries) {
        if (asset.assetType !== 'script' && asset.inject) {
            const htmlTag = asset.isEntry ? (0, inferHtmlTags_js_1.inferAssetTag)(asset) : (0, inferHtmlTags_js_1.inferPreloadTag)(asset);
            htmlTags.push({ htmlTag, position: asset.inject });
        }
    }
    // JavaScript
    const positionProd = injectJavaScriptDuringStream ? 'STREAM' : 'HTML_END';
    const positionScript = !isProduction ? 'HTML_BEGIN' : positionProd;
    const positionJsonData = !isProduction && !pageContext._pageContextPromise && !pageContext._isStream ? 'HTML_BEGIN' : positionProd;
    const jsScript = await getMergedScriptTag(pageAssets, isProduction);
    if (jsScript) {
        htmlTags.push({
            htmlTag: jsScript,
            position: positionScript
        });
    }
    for (const asset of injectFilterEntries) {
        if (asset.assetType === 'script' && asset.inject) {
            const htmlTag = asset.isEntry ? (0, inferHtmlTags_js_1.inferAssetTag)(asset) : (0, inferHtmlTags_js_1.inferPreloadTag)(asset);
            const position = asset.inject === 'HTML_END' ? positionScript : asset.inject;
            htmlTags.push({ htmlTag, position });
        }
    }
    // `pageContext` JSON data
    if (!isHtmlOnly) {
        // Don't allow the user to manipulate with injectFilter(): injecting <script type="application/json"> before the stream can break the app when:
        //  - using https://vite-plugin-ssr.com/stream#initial-data-after-stream-end
        //  - `pageContext` is modified during the stream, e.g. /examples/vue-pinia which uses https://vuejs.org/api/composition-api-lifecycle.html#onserverprefetch
        // The <script> tags are handled separately by vite-plugin-ssr down below.
        htmlTags.push({
            // Needs to be called after `resolvePageContextPromise()`
            htmlTag: () => getPageContextTag(pageContext),
            position: positionJsonData
        });
    }
    return htmlTags;
}
exports.getHtmlTags = getHtmlTags;
async function getMergedScriptTag(pageAssets, isProduction) {
    const scriptAssets = pageAssets.filter((pageAsset) => pageAsset.isEntry && pageAsset.assetType === 'script');
    const viteScripts = await (0, getViteDevScripts_js_1.getViteDevScripts)();
    const scriptTagsHtml = `${viteScripts}${scriptAssets.map((asset) => (0, inferHtmlTags_js_1.inferAssetTag)(asset)).join('')}`;
    const scriptTag = (0, mergeScriptTags_js_1.mergeScriptTags)(scriptTagsHtml, isProduction);
    return scriptTag;
}
function getPageContextTag(pageContext) {
    const pageContextSerialized = (0, sanitizeJson_js_1.sanitizeJson)((0, serializePageContextClientSide_js_1.serializePageContextClientSide)(pageContext));
    const htmlTag = `<script id="vite-plugin-ssr_pageContext" type="application/json">${pageContextSerialized}</script>`;
    // @ts-expect-error
    pageContext._pageContextHtmlTag = htmlTag;
    return htmlTag;
}
function assertInjectFilterEntries(injectFilterEntries, stamp) {
    try {
        assertInjectFilterUsage(injectFilterEntries, stamp);
    }
    catch (err) {
        if (err?.message.includes('[Wrong Usage]')) {
            (0, utils_js_1.assert)(false);
        }
        throw err;
    }
}
function assertInjectFilterUsage(injectFilterEntries, stamp) {
    injectFilterEntries.forEach((entry, i) => {
        (0, utils_js_1.assertUsage)((0, utils_js_1.isObject)(entry), `[injectFilter()] Entry ${i} isn't an object`);
        (0, utils_js_1.assertUsage)(typeof entry.src === 'string', `[injectFilter()] Entry ${i} is missing property ${picocolors_1.default.cyan('src')}`);
        (0, utils_js_1.assertUsage)(entry[stamp] === true, `[injectFilter()] Entry ${i} (${entry.src}) isn't the original object, see https://vite-plugin-ssr.com/injectFilter`);
        (0, utils_js_1.assert)([false, 'HTML_BEGIN', 'HTML_END'].includes(entry.inject));
        (0, utils_js_1.assert)(entry.assetType === null || typeof entry.assetType === 'string');
        (0, utils_js_1.assert)(entry.mediaType === null || typeof entry.mediaType === 'string');
        (0, utils_js_1.assert)(typeof entry.isEntry === 'boolean');
        (0, utils_js_1.assert)(Object.keys(entry).length === 5);
    });
}
