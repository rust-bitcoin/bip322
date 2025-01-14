"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectHtmlTagsToStream = exports.injectHtmlTagsToString = void 0;
const utils_js_1 = require("../utils.js");
const assertPageContextProvidedByUser_js_1 = require("../../../shared/assertPageContextProvidedByUser.js");
const injectHtmlTags_js_1 = require("./injectAssets/injectHtmlTags.js");
const getHtmlTags_js_1 = require("./injectAssets/getHtmlTags.js");
async function injectHtmlTagsToString(htmlParts, pageContext, injectFilter) {
    const htmlTags = await (0, getHtmlTags_js_1.getHtmlTags)(pageContext, null, injectFilter);
    const pageAssets = await pageContext.__getPageAssets();
    let htmlString = htmlPartsToString(htmlParts, pageAssets);
    htmlString = injectToHtmlBegin(htmlString, htmlTags, null);
    htmlString = injectToHtmlEnd(htmlString, htmlTags);
    return htmlString;
}
exports.injectHtmlTagsToString = injectHtmlTagsToString;
function injectHtmlTagsToStream(pageContext, injectToStream, injectFilter) {
    let htmlTags;
    return {
        injectAtStreamBegin,
        injectAtStreamEnd
    };
    async function injectAtStreamBegin(htmlPartsBegin) {
        htmlTags = await (0, getHtmlTags_js_1.getHtmlTags)(pageContext, injectToStream, injectFilter);
        const pageAssets = await pageContext.__getPageAssets();
        let htmlBegin = htmlPartsToString(htmlPartsBegin, pageAssets);
        htmlBegin = injectToHtmlBegin(htmlBegin, htmlTags, injectToStream);
        return htmlBegin;
    }
    async function injectAtStreamEnd(htmlPartsEnd) {
        (0, utils_js_1.assert)(htmlTags);
        await resolvePageContextPromise(pageContext);
        const pageAssets = await pageContext.__getPageAssets();
        let htmlEnd = htmlPartsToString(htmlPartsEnd, pageAssets);
        htmlEnd = injectToHtmlEnd(htmlEnd, htmlTags);
        return htmlEnd;
    }
}
exports.injectHtmlTagsToStream = injectHtmlTagsToStream;
function injectToHtmlBegin(htmlBegin, htmlTags, injectToStream) {
    const htmlTagsAtBegin = htmlTags.filter((snippet) => snippet.position !== 'HTML_END');
    // Ensure existence of `<head>`
    htmlBegin = (0, injectHtmlTags_js_1.createHtmlHeadIfMissing)(htmlBegin);
    htmlBegin = (0, injectHtmlTags_js_1.injectHtmlTags)(htmlBegin, htmlTagsAtBegin, injectToStream);
    return htmlBegin;
}
function injectToHtmlEnd(htmlEnd, htmlTags) {
    const htmlTagsAtEnd = htmlTags.filter((snippet) => snippet.position === 'HTML_END');
    htmlEnd = (0, injectHtmlTags_js_1.injectHtmlTags)(htmlEnd, htmlTagsAtEnd, null);
    return htmlEnd;
}
async function resolvePageContextPromise(pageContext) {
    const pageContextPromise = pageContext._pageContextPromise;
    if (!pageContextPromise) {
        return;
    }
    let pageContextProvidedByUser;
    if ((0, utils_js_1.isCallable)(pageContextPromise)) {
        pageContextProvidedByUser = await pageContextPromise();
    }
    else if ((0, utils_js_1.isPromise)(pageContextPromise)) {
        pageContextProvidedByUser = await pageContextPromise;
    }
    else {
        (0, utils_js_1.assert)(false);
    }
    (0, assertPageContextProvidedByUser_js_1.assertPageContextProvidedByUser)(pageContextProvidedByUser, pageContext._renderHook);
    Object.assign(pageContext, pageContextProvidedByUser);
}
function htmlPartsToString(htmlParts, pageAssets) {
    let htmlString = '';
    htmlParts.forEach((p) => {
        htmlString += typeof p === 'string' ? p : p(pageAssets);
    });
    return htmlString;
}
