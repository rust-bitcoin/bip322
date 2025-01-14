export { escapeInject };
export { dangerouslySkipEscape };
export { renderDocumentHtml };
export { isDocumentHtml };
export { getHtmlString };
import { assert, assertUsage, assertWarning, checkType, hasProp, isHtml, isPromise, objectAssign } from '../utils.js';
import { injectHtmlTagsToString, injectHtmlTagsToStream } from './injectAssets.js';
import { processStream, isStream, streamToString } from './stream.js';
import { isStreamReactStreaming } from './stream/react-streaming.js';
import { getGlobalContext } from '../globalContext.js';
import pc from '@brillout/picocolors';
function isDocumentHtml(something) {
    if (isTemplateWrapped(something) || isEscapedString(something) || isStream(something)) {
        checkType(something);
        return true;
    }
    return false;
}
async function renderDocumentHtml(documentHtml, pageContext, onErrorWhileStreaming, injectFilter) {
    if (isEscapedString(documentHtml)) {
        objectAssign(pageContext, { _isStream: false });
        let htmlString = getEscapedString(documentHtml);
        htmlString = await injectHtmlTagsToString([htmlString], pageContext, injectFilter);
        return htmlString;
    }
    if (isStream(documentHtml)) {
        objectAssign(pageContext, { _isStream: true });
        const stream = documentHtml;
        const streamWrapper = await renderHtmlStream(stream, null, pageContext, onErrorWhileStreaming, injectFilter);
        return streamWrapper;
    }
    if (isTemplateWrapped(documentHtml)) {
        const templateContent = documentHtml._template;
        const render = await renderTemplate(templateContent, pageContext);
        if (!('htmlStream' in render)) {
            objectAssign(pageContext, { _isStream: false });
            const { htmlPartsAll } = render;
            const htmlString = await injectHtmlTagsToString(htmlPartsAll, pageContext, injectFilter);
            return htmlString;
        }
        else {
            objectAssign(pageContext, { _isStream: true });
            const { htmlStream } = render;
            const streamWrapper = await renderHtmlStream(htmlStream, {
                htmlPartsBegin: render.htmlPartsBegin,
                htmlPartsEnd: render.htmlPartsEnd
            }, pageContext, onErrorWhileStreaming, injectFilter);
            return streamWrapper;
        }
    }
    checkType(documentHtml);
    assert(false);
}
async function renderHtmlStream(streamOriginal, injectString, pageContext, onErrorWhileStreaming, injectFilter) {
    const opts = {
        onErrorWhileStreaming,
        enableEagerStreaming: pageContext.enableEagerStreaming
    };
    if (injectString) {
        let injectToStream = null;
        if (isStreamReactStreaming(streamOriginal) && !streamOriginal.disabled) {
            injectToStream = streamOriginal.injectToStream;
        }
        const { injectAtStreamBegin, injectAtStreamEnd } = injectHtmlTagsToStream(pageContext, injectToStream, injectFilter);
        objectAssign(opts, {
            injectStringAtBegin: async () => {
                return await injectAtStreamBegin(injectString.htmlPartsBegin);
            },
            injectStringAtEnd: async () => {
                return await injectAtStreamEnd(injectString.htmlPartsEnd);
            }
        });
    }
    const streamWrapper = await processStream(streamOriginal, opts);
    return streamWrapper;
}
function isTemplateWrapped(something) {
    return hasProp(something, '_template');
}
function isEscapedString(something) {
    const result = hasProp(something, '_escaped');
    if (result) {
        assert(hasProp(something, '_escaped', 'string'));
        checkType(something);
    }
    return result;
}
function getEscapedString(escapedString) {
    let htmlString;
    assert(hasProp(escapedString, '_escaped'));
    htmlString = escapedString._escaped;
    assert(typeof htmlString === 'string');
    return htmlString;
}
function escapeInject(templateStrings, ...templateVariables) {
    assertUsage(templateStrings.length === templateVariables.length + 1 && templateStrings.every((str) => typeof str === 'string'), `You're using ${pc.cyan('escapeInject')} as a function, but ${pc.cyan('escapeInject')} is a string template tag, see https://vite-plugin-ssr.com/escapeInject`, { showStackTrace: true });
    return {
        _template: {
            templateStrings,
            templateVariables: templateVariables
        }
    };
}
function dangerouslySkipEscape(alreadyEscapedString) {
    return _dangerouslySkipEscape(alreadyEscapedString);
}
function _dangerouslySkipEscape(arg) {
    if (hasProp(arg, '_escaped')) {
        assert(isEscapedString(arg));
        return arg;
    }
    assertUsage(!isPromise(arg), `[dangerouslySkipEscape(${pc.cyan('str')})] Argument ${pc.cyan('str')} is a promise. It should be a string instead (or a stream). Make sure to ${pc.cyan('await str')}.`, { showStackTrace: true });
    if (typeof arg === 'string') {
        return { _escaped: arg };
    }
    assertWarning(false, `[dangerouslySkipEscape(${pc.cyan('str')})] Argument ${pc.cyan('str')} should be a string but we got ${pc.cyan(`typeof str === "${typeof arg}"`)}.`, {
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
        assertUsage(!htmlStream, `Injecting two streams in ${pc.cyan('escapeInject')} template tag of ${hookName}() hook defined by ${hookFilePath}. Inject only one stream instead.`);
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
        if (isStream(templateVar)) {
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
        assertUsage(!isPromise(templateVar), getErrMsg('a promise', `Did you forget to ${pc.cyan('await')} the promise?`));
        if (templateVar === undefined || templateVar === null) {
            assertWarning(false, getErrMsg(`${pc.cyan(String(templateVar))} which will be converted to an empty string`, `Pass an empty string instead of ${pc.cyan(String(templateVar))} to remove this warning.`), { onlyOnce: false });
            templateVar = '';
        }
        {
            const varType = typeof templateVar;
            const streamNote = ['boolean', 'number', 'bigint', 'symbol'].includes(varType)
                ? null
                : '(See https://vite-plugin-ssr.com/stream for HTML streaming.)';
            assertUsage(varType === 'string', getErrMsg(pc.cyan(`typeof htmlVar === "${varType}"`), streamNote));
        }
        {
            const { isProduction } = getGlobalContext();
            if (isHtml(templateVar) &&
                // We don't show this warning in production because it's expected that some users may (un)willingly do some XSS injection: we avoid flooding the production logs.
                !isProduction) {
                assertWarning(false, getErrMsg(`${pc.cyan(templateVar)} which seems to be HTML code`, 'Did you forget to wrap the value with dangerouslySkipEscape()?'), { onlyOnce: false });
            }
        }
        // Escape untrusted template variable
        addHtmlPart(escapeHtml(templateVar));
    }
    assert(templateStrings.length === templateVariables.length + 1);
    addHtmlPart(templateStrings[templateStrings.length - 1]);
    if (htmlStream === null) {
        assert(htmlPartsEnd.length === 0);
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
    if (isStream(htmlRender)) {
        return streamToString(htmlRender);
    }
    checkType(htmlRender);
    assert(false);
}
