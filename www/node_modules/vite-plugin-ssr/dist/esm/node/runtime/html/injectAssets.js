export { injectHtmlTagsToString };
export { injectHtmlTagsToStream };
import { assert, isCallable, isPromise } from '../utils.js';
import { assertPageContextProvidedByUser } from '../../../shared/assertPageContextProvidedByUser.js';
import { injectHtmlTags, createHtmlHeadIfMissing } from './injectAssets/injectHtmlTags.js';
import { getHtmlTags } from './injectAssets/getHtmlTags.js';
async function injectHtmlTagsToString(htmlParts, pageContext, injectFilter) {
    const htmlTags = await getHtmlTags(pageContext, null, injectFilter);
    const pageAssets = await pageContext.__getPageAssets();
    let htmlString = htmlPartsToString(htmlParts, pageAssets);
    htmlString = injectToHtmlBegin(htmlString, htmlTags, null);
    htmlString = injectToHtmlEnd(htmlString, htmlTags);
    return htmlString;
}
function injectHtmlTagsToStream(pageContext, injectToStream, injectFilter) {
    let htmlTags;
    return {
        injectAtStreamBegin,
        injectAtStreamEnd
    };
    async function injectAtStreamBegin(htmlPartsBegin) {
        htmlTags = await getHtmlTags(pageContext, injectToStream, injectFilter);
        const pageAssets = await pageContext.__getPageAssets();
        let htmlBegin = htmlPartsToString(htmlPartsBegin, pageAssets);
        htmlBegin = injectToHtmlBegin(htmlBegin, htmlTags, injectToStream);
        return htmlBegin;
    }
    async function injectAtStreamEnd(htmlPartsEnd) {
        assert(htmlTags);
        await resolvePageContextPromise(pageContext);
        const pageAssets = await pageContext.__getPageAssets();
        let htmlEnd = htmlPartsToString(htmlPartsEnd, pageAssets);
        htmlEnd = injectToHtmlEnd(htmlEnd, htmlTags);
        return htmlEnd;
    }
}
function injectToHtmlBegin(htmlBegin, htmlTags, injectToStream) {
    const htmlTagsAtBegin = htmlTags.filter((snippet) => snippet.position !== 'HTML_END');
    // Ensure existence of `<head>`
    htmlBegin = createHtmlHeadIfMissing(htmlBegin);
    htmlBegin = injectHtmlTags(htmlBegin, htmlTagsAtBegin, injectToStream);
    return htmlBegin;
}
function injectToHtmlEnd(htmlEnd, htmlTags) {
    const htmlTagsAtEnd = htmlTags.filter((snippet) => snippet.position === 'HTML_END');
    htmlEnd = injectHtmlTags(htmlEnd, htmlTagsAtEnd, null);
    return htmlEnd;
}
async function resolvePageContextPromise(pageContext) {
    const pageContextPromise = pageContext._pageContextPromise;
    if (!pageContextPromise) {
        return;
    }
    let pageContextProvidedByUser;
    if (isCallable(pageContextPromise)) {
        pageContextProvidedByUser = await pageContextPromise();
    }
    else if (isPromise(pageContextPromise)) {
        pageContextProvidedByUser = await pageContextPromise;
    }
    else {
        assert(false);
    }
    assertPageContextProvidedByUser(pageContextProvidedByUser, pageContext._renderHook);
    Object.assign(pageContext, pageContextProvidedByUser);
}
function htmlPartsToString(htmlParts, pageAssets) {
    let htmlString = '';
    htmlParts.forEach((p) => {
        htmlString += typeof p === 'string' ? p : p(pageAssets);
    });
    return htmlString;
}
