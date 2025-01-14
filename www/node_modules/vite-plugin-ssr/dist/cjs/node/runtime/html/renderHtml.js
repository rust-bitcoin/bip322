"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtmlString = exports.isDocumentHtml = exports.renderDocumentHtml = exports.dangerouslySkipEscape = exports.escapeInject = void 0;
const utils_js_1 = require("../utils.js");
const injectAssets_js_1 = require("./injectAssets.js");
const stream_js_1 = require("./stream.js");
const react_streaming_js_1 = require("./stream/react-streaming.js");
const globalContext_js_1 = require("../globalContext.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function isDocumentHtml(something) {
    if (isTemplateWrapped(something) || isEscapedString(something) || (0, stream_js_1.isStream)(something)) {
        (0, utils_js_1.checkType)(something);
        return true;
    }
    return false;
}
exports.isDocumentHtml = isDocumentHtml;
async function renderDocumentHtml(documentHtml, pageContext, onErrorWhileStreaming, injectFilter) {
    if (isEscapedString(documentHtml)) {
        (0, utils_js_1.objectAssign)(pageContext, { _isStream: false });
        let htmlString = getEscapedString(documentHtml);
        htmlString = await (0, injectAssets_js_1.injectHtmlTagsToString)([htmlString], pageContext, injectFilter);
        return htmlString;
    }
    if ((0, stream_js_1.isStream)(documentHtml)) {
        (0, utils_js_1.objectAssign)(pageContext, { _isStream: true });
        const stream = documentHtml;
        const streamWrapper = await renderHtmlStream(stream, null, pageContext, onErrorWhileStreaming, injectFilter);
        return streamWrapper;
    }
    if (isTemplateWrapped(documentHtml)) {
        const templateContent = documentHtml._template;
        const render = await renderTemplate(templateContent, pageContext);
        if (!('htmlStream' in render)) {
            (0, utils_js_1.objectAssign)(pageContext, { _isStream: false });
            const { htmlPartsAll } = render;
            const htmlString = await (0, injectAssets_js_1.injectHtmlTagsToString)(htmlPartsAll, pageContext, injectFilter);
            return htmlString;
        }
        else {
            (0, utils_js_1.objectAssign)(pageContext, { _isStream: true });
            const { htmlStream } = render;
            const streamWrapper = await renderHtmlStream(htmlStream, {
                htmlPartsBegin: render.htmlPartsBegin,
                htmlPartsEnd: render.htmlPartsEnd
            }, pageContext, onErrorWhileStreaming, injectFilter);
            return streamWrapper;
        }
    }
    (0, utils_js_1.checkType)(documentHtml);
    (0, utils_js_1.assert)(false);
}
exports.renderDocumentHtml = renderDocumentHtml;
async function renderHtmlStream(streamOriginal, injectString, pageContext, onErrorWhileStreaming, injectFilter) {
    const opts = {
        onErrorWhileStreaming,
        enableEagerStreaming: pageContext.enableEagerStreaming
    };
    if (injectString) {
        let injectToStream = null;
        if ((0, react_streaming_js_1.isStreamReactStreaming)(streamOriginal) && !streamOriginal.disabled) {
            injectToStream = streamOriginal.injectToStream;
        }
        const { injectAtStreamBegin, injectAtStreamEnd } = (0, injectAssets_js_1.injectHtmlTagsToStream)(pageContext, injectToStream, injectFilter);
        (0, utils_js_1.objectAssign)(opts, {
            injectStringAtBegin: async () => {
                return await injectAtStreamBegin(injectString.htmlPartsBegin);
            },
            injectStringAtEnd: async () => {
                return await injectAtStreamEnd(injectString.htmlPartsEnd);
            }
        });
    }
    const streamWrapper = await (0, stream_js_1.processStream)(streamOriginal, opts);
    return streamWrapper;
}
function isTemplateWrapped(something) {
    return (0, utils_js_1.hasProp)(something, '_template');
}
function isEscapedString(something) {
    const result = (0, utils_js_1.hasProp)(something, '_escaped');
    if (result) {
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(something, '_escaped', 'string'));
        (0, utils_js_1.checkType)(something);
    }
    return result;
}
function getEscapedString(escapedString) {
    let htmlString;
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(escapedString, '_escaped'));
    htmlString = escapedString._escaped;
    (0, utils_js_1.assert)(typeof htmlString === 'string');
    return htmlString;
}
function escapeInject(templateStrings, ...templateVariables) {
    (0, utils_js_1.assertUsage)(templateStrings.length === templateVariables.length + 1 && templateStrings.every((str) => typeof str === 'string'), `You're using ${picocolors_1.default.cyan('escapeInject')} as a function, but ${picocolors_1.default.cyan('escapeInject')} is a string template tag, see https://vite-plugin-ssr.com/escapeInject`, { showStackTrace: true });
    return {
        _template: {
            templateStrings,
            templateVariables: templateVariables
        }
    };
}
exports.escapeInject = escapeInject;
function dangerouslySkipEscape(alreadyEscapedString) {
    return _dangerouslySkipEscape(alreadyEscapedString);
}
exports.dangerouslySkipEscape = dangerouslySkipEscape;
function _dangerouslySkipEscape(arg) {
    if ((0, utils_js_1.hasProp)(arg, '_escaped')) {
        (0, utils_js_1.assert)(isEscapedString(arg));
        return arg;
    }
    (0, utils_js_1.assertUsage)(!(0, utils_js_1.isPromise)(arg), `[dangerouslySkipEscape(${picocolors_1.default.cyan('str')})] Argument ${picocolors_1.default.cyan('str')} is a promise. It should be a string instead (or a stream). Make sure to ${picocolors_1.default.cyan('await str')}.`, { showStackTrace: true });
    if (typeof arg === 'string') {
        return { _escaped: arg };
    }
    (0, utils_js_1.assertWarning)(false, `[dangerouslySkipEscape(${picocolors_1.default.cyan('str')})] Argument ${picocolors_1.default.cyan('str')} should be a string but we got ${picocolors_1.default.cyan(`typeof str === "${typeof arg}"`)}.`, {
        onlyOnce: false,
        showStackTrace: true
    });
    return { _escaped: String(arg) };
}
async function renderTemplate(templateContent, pageContext) {
    const htmlPartsBegin = [];
    const htmlPartsEnd = [];
    let htmlStream = null;
    const addHtmlPart = (htmlPart) => {
        if (htmlStream === null) {
            htmlPartsBegin.push(htmlPart);
        }
        else {
            htmlPartsEnd.push(htmlPart);
        }
    };
    const setStream = (stream) => {
        const { hookName, hookFilePath } = pageContext._renderHook;
        (0, utils_js_1.assertUsage)(!htmlStream, `Injecting two streams in ${picocolors_1.default.cyan('escapeInject')} template tag of ${hookName}() hook defined by ${hookFilePath}. Inject only one stream instead.`);
        htmlStream = stream;
    };
    const { templateStrings, templateVariables } = templateContent;
    for (let i = 0; i < templateVariables.length; i++) {
        addHtmlPart(templateStrings[i]);
        let templateVar = templateVariables[i];
        // Process `dangerouslySkipEscape()`
        if (isEscapedString(templateVar)) {
            const htmlString = getEscapedString(templateVar);
            // User used `dangerouslySkipEscape()` so we assume the string to be safe
            addHtmlPart(htmlString);
            continue;
        }
        // Process `escapeInject` fragments
        if (isTemplateWrapped(templateVar)) {
            const templateContentInner = templateVar._template;
            const result = await renderTemplate(templateContentInner, pageContext);
            if (!('htmlStream' in result)) {
                result.htmlPartsAll.forEach(addHtmlPart);
            }
            else {
                result.htmlPartsBegin.forEach(addHtmlPart);
                setStream(result.htmlStream);
                result.htmlPartsEnd.forEach(addHtmlPart);
            }
            continue;
        }
        if ((0, stream_js_1.isStream)(templateVar)) {
            setStream(templateVar);
            continue;
        }
        const getErrMsg = (typeText, end) => {
            const { hookName, hookFilePath } = pageContext._renderHook;
            const nth = (i === 0 && '1st') || (i === 1 && '2nd') || (i === 2 && '3rd') || `${i}-th`;
            return [`The ${nth} HTML variable is ${typeText}, see ${hookName}() hook defined by ${hookFilePath}.`, end]
                .filter(Boolean)
                .join(' ');
        };
        (0, utils_js_1.assertUsage)(!(0, utils_js_1.isPromise)(templateVar), getErrMsg('a promise', `Did you forget to ${picocolors_1.default.cyan('await')} the promise?`));
        if (templateVar === undefined || templateVar === null) {
            (0, utils_js_1.assertWarning)(false, getErrMsg(`${picocolors_1.default.cyan(String(templateVar))} which will be converted to an empty string`, `Pass an empty string instead of ${picocolors_1.default.cyan(String(templateVar))} to remove this warning.`), { onlyOnce: false });
            templateVar = '';
        }
        {
            const varType = typeof templateVar;
            const streamNote = ['boolean', 'number', 'bigint', 'symbol'].includes(varType)
                ? null
                : '(See https://vite-plugin-ssr.com/stream for HTML streaming.)';
            (0, utils_js_1.assertUsage)(varType === 'string', getErrMsg(picocolors_1.default.cyan(`typeof htmlVar === "${varType}"`), streamNote));
        }
        {
            const { isProduction } = (0, globalContext_js_1.getGlobalContext)();
            if ((0, utils_js_1.isHtml)(templateVar) &&
                // We don't show this warning in production because it's expected that some users may (un)willingly do some XSS injection: we avoid flooding the production logs.
                !isProduction) {
                (0, utils_js_1.assertWarning)(false, getErrMsg(`${picocolors_1.default.cyan(templateVar)} which seems to be HTML code`, 'Did you forget to wrap the value with dangerouslySkipEscape()?'), { onlyOnce: false });
            }
        }
        // Escape untrusted template variable
        addHtmlPart(escapeHtml(templateVar));
    }
    (0, utils_js_1.assert)(templateStrings.length === templateVariables.length + 1);
    addHtmlPart(templateStrings[templateStrings.length - 1]);
    if (htmlStream === null) {
        (0, utils_js_1.assert)(htmlPartsEnd.length === 0);
        return {
            htmlPartsAll: htmlPartsBegin
        };
    }
    return {
        htmlStream,
        htmlPartsBegin,
        htmlPartsEnd
    };
}
function escapeHtml(unsafeString) {
    // Source: https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript/6234804#6234804
    const safe = unsafeString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    return safe;
}
async function getHtmlString(htmlRender) {
    if (typeof htmlRender === 'string') {
        return htmlRender;
    }
    if ((0, stream_js_1.isStream)(htmlRender)) {
        return (0, stream_js_1.streamToString)(htmlRender);
    }
    (0, utils_js_1.checkType)(htmlRender);
    (0, utils_js_1.assert)(false);
}
exports.getHtmlString = getHtmlString;
