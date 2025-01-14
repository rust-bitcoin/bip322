"use strict";
// Unit tests at ./injectHtmlTags.spec.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectAtClosingTag = exports.injectAtOpeningTag = exports.createHtmlHeadIfMissing = exports.injectHtmlTags = void 0;
const utils_js_1 = require("../../utils.js");
const POSITIONS = ['HTML_BEGIN', 'HTML_END', 'STREAM'];
function injectHtmlTags(htmlString, htmlTags, injectToStream) {
    POSITIONS.forEach((position) => {
        const htmlFragment = htmlTags
            .filter((h) => h.position === position)
            .map((h) => resolveHtmlTag(h.htmlTag))
            .join('');
        if (htmlFragment) {
            htmlString = injectHtmlFragment(position, htmlFragment, htmlString, injectToStream);
        }
    });
    return htmlString;
}
exports.injectHtmlTags = injectHtmlTags;
function injectHtmlFragment(position, htmlFragment, htmlString, injectToStream) {
    if (position === 'HTML_BEGIN') {
        {
            const res = injectAtPaceholder(htmlFragment, htmlString, true);
            if (res)
                return res;
        }
        (0, utils_js_1.assert)(tagOpeningExists('head', htmlString));
        htmlString = injectAtOpeningTag('head', htmlString, htmlFragment);
        return htmlString;
    }
    if (position === 'HTML_END') {
        {
            const res = injectAtPaceholder(htmlFragment, htmlString, false);
            if (res)
                return res;
        }
        if (tagClosingExists('body', htmlString)) {
            return injectAtClosingTag('body', htmlString, htmlFragment);
        }
        if (tagClosingExists('html', htmlString)) {
            return injectAtClosingTag('html', htmlString, htmlFragment);
        }
        return htmlString + '\n' + htmlFragment;
    }
    if (position === 'STREAM') {
        (0, utils_js_1.assert)(injectToStream);
        injectToStream(htmlFragment, { flush: true });
        return htmlString;
    }
    (0, utils_js_1.assert)(false);
}
function resolveHtmlTag(htmlTag) {
    return typeof htmlTag !== 'string' ? htmlTag() : htmlTag;
}
function injectAtOpeningTag(tag, htmlString, htmlFragment) {
    const openingTag = getTagOpening(tag);
    const matches = htmlString.match(openingTag);
    (0, utils_js_1.assert)(matches && matches.length >= 1);
    const tagInstance = matches[0];
    (0, utils_js_1.assert)(tagInstance);
    const htmlParts = htmlString.split(tagInstance);
    (0, utils_js_1.assert)(htmlParts.length >= 2);
    // Insert `htmlFragment` after first `tagInstance`
    const before = (0, utils_js_1.slice)(htmlParts, 0, 1)[0] + tagInstance;
    const after = (0, utils_js_1.slice)(htmlParts, 1, 0).join(tagInstance);
    htmlFragment = injectBreakLines(htmlFragment, before, after);
    return before + htmlFragment + after;
}
exports.injectAtOpeningTag = injectAtOpeningTag;
function injectAtClosingTag(tag, htmlString, htmlFragment) {
    const tagClosing = getTagClosing(tag);
    const matches = htmlString.match(tagClosing);
    (0, utils_js_1.assert)(matches && matches.length >= 1);
    const tagInstance = matches[0];
    (0, utils_js_1.assert)(tagInstance);
    const htmlParts = htmlString.split(tagInstance);
    (0, utils_js_1.assert)(htmlParts.length >= 2);
    // Insert `htmlFragment` before last `tagClosing`
    const before = (0, utils_js_1.slice)(htmlParts, 0, -1).join(tagInstance);
    const after = tagInstance + (0, utils_js_1.slice)(htmlParts, -1, 0);
    htmlFragment = injectBreakLines(htmlFragment, before, after);
    return before + htmlFragment + after;
}
exports.injectAtClosingTag = injectAtClosingTag;
function injectBreakLines(htmlFragment, before, after) {
    (0, utils_js_1.assert)(htmlFragment.trim() === htmlFragment);
    const currentLineBefore = before.split('\n').slice(-1)[0];
    let paddingParent = currentLineBefore.match(/\s*$/)[0];
    let isBlankLine = !!paddingParent;
    if (!paddingParent) {
        paddingParent = currentLineBefore.match(/^\s*/)[0];
    }
    if (!paddingParent)
        return htmlFragment;
    const whitespaceExtra = paddingParent ? '  ' : '';
    const whitespace = `${paddingParent}${whitespaceExtra}`;
    const padding = `\n${whitespace}`;
    htmlFragment = htmlFragment.split(/<(?=[^\/])/).join(`${padding}<`);
    if (isBlankLine) {
        (0, utils_js_1.assert)(htmlFragment.startsWith(padding), { htmlFragment });
        htmlFragment = whitespaceExtra + htmlFragment.slice(padding.length);
    }
    const currentLineAfter = after.split('\n')[0];
    if (currentLineAfter.trim().length > 0) {
        htmlFragment += '\n' + paddingParent;
    }
    return htmlFragment;
}
function createHtmlHeadIfMissing(htmlString) {
    const assertion = () => (0, utils_js_1.assert)(tagOpeningExists('head', htmlString) && tagClosingExists('head', htmlString));
    if (tagOpeningExists('head', htmlString) && tagClosingExists('head', htmlString)) {
        assertion();
        return htmlString;
    }
    const htmlFragment = '<head></head>';
    if (tagOpeningExists('html', htmlString)) {
        htmlString = injectAtOpeningTag('html', htmlString, htmlFragment);
        assertion();
        return htmlString;
    }
    if (tagOpeningExists('!doctype', htmlString)) {
        htmlString = injectAtOpeningTag('!doctype', htmlString, htmlFragment);
        assertion();
        return htmlString;
    }
    htmlString = htmlFragment + '\n' + htmlString;
    assertion();
    return htmlString;
}
exports.createHtmlHeadIfMissing = createHtmlHeadIfMissing;
// Pay attention to performance when searching for tags
// Use the most effective way to test or match tag existence
// Use tag existence checking with caution as it is costly operation
function tagOpeningExists(tag, htmlString) {
    const tagOpeningRE = getTagOpening(tag);
    return tagOpeningRE.test(htmlString);
}
function tagClosingExists(tag, htmlString) {
    const tagClosingRE = getTagClosing(tag);
    return tagClosingRE.test(htmlString);
}
function getTagOpening(tag) {
    const tagOpening = new RegExp(`<${tag}(>| [^>]*>)`, 'i');
    return tagOpening;
}
function getTagClosing(tag) {
    const tagClosing = new RegExp(`</${tag}>`, 'i');
    return tagClosing;
}
function injectAtPaceholder(htmlFragment, htmlString, isFirst) {
    const placeholder = isFirst ? '__VITE_PLUGIN_SSR__ASSETS_FIRST__' : '__VITE_PLUGIN__SSR_ASSETS_LAST__';
    const parts = htmlString.split(placeholder);
    if (parts.length === 1)
        return null;
    (0, utils_js_1.assertUsage)(parts.length === 2, "You're inserting assets twice into your HTML", { showStackTrace: true });
    return [parts[0], htmlFragment, parts[1]].join('');
}
