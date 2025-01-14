export { escapeInject };
export { dangerouslySkipEscape };
export { renderDocumentHtml };
export { isDocumentHtml };
export { getHtmlString };
export type { HtmlRender };
export type { HtmlPart };
export type { DocumentHtml };
export type { TemplateWrapped };
import type { PageContextInjectAssets } from './injectAssets.js';
import { StreamProviderAny, StreamTypePatch, StreamProviderNormalized } from './stream.js';
import type { PageAsset } from '../renderPage/getPageAssets.js';
import type { PreloadFilter } from './injectAssets/getHtmlTags.js';
type DocumentHtml = TemplateWrapped | EscapedString | StreamProviderAny;
type HtmlRender = string | StreamProviderNormalized;
type TemplateStrings = TemplateStringsArray;
type TemplateVariable = string | EscapedString | StreamProviderAny | TemplateWrapped;
type TemplateWrapped = {
    _template: TemplateContent;
};
type TemplateContent = {
    templateStrings: TemplateStrings;
    templateVariables: TemplateVariable[];
};
declare function isDocumentHtml(something: unknown): something is DocumentHtml;
declare function renderDocumentHtml(documentHtml: DocumentHtml, pageContext: PageContextInjectAssets, onErrorWhileStreaming: (err: unknown) => void, injectFilter: PreloadFilter): Promise<HtmlRender>;
declare function escapeInject(templateStrings: TemplateStrings, ...templateVariables: (TemplateVariable | StreamTypePatch)[]): TemplateWrapped;
type EscapedString = {
    _escaped: string;
};
declare function dangerouslySkipEscape(alreadyEscapedString: string): EscapedString;
type HtmlPart = string | ((pageAssets: PageAsset[]) => string);
declare function getHtmlString(htmlRender: HtmlRender): Promise<string>;
