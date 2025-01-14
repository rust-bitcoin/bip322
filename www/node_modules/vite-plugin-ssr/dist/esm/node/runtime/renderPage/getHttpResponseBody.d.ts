/// <reference types="node" resolution-mode="require"/>
export { getHttpResponseBody };
export { getHttpResponseBodyStreamHandlers };
export type { HttpResponseBody };
import { StreamPipeNode, StreamPipeWeb, StreamReadableNode, StreamReadableWeb, StreamWritableNode, StreamWritableWeb } from '../html/stream.js';
import { type HtmlRender } from '../html/renderHtml.js';
import type { RenderHook } from './executeOnRenderHtmlHook.js';
type HttpResponseBody = {
    body: string;
    getBody: () => Promise<string>;
    getReadableWebStream: () => StreamReadableWeb;
    pipe: (writable: StreamWritableWeb | StreamWritableNode) => void;
    /** @deprecated */
    getNodeStream: () => Promise<StreamReadableNode>;
    /** @deprecated */
    getWebStream: () => StreamReadableWeb;
    /** @deprecated */
    pipeToNodeWritable: StreamPipeNode;
    /** @deprecated */
    pipeToWebWritable: StreamPipeWeb;
};
declare function getHttpResponseBody(htmlRender: HtmlRender, renderHook: null | RenderHook): string;
declare function getHttpResponseBodyStreamHandlers(htmlRender: HtmlRender, renderHook: null | RenderHook): {
    getBody(): Promise<string>;
    getNodeStream(): Promise<import("stream").Readable>;
    getWebStream(): StreamReadableWeb;
    getReadableWebStream(): StreamReadableWeb;
    pipeToWebWritable(writable: StreamWritableWeb): void;
    pipeToNodeWritable(writable: StreamWritableNode): void;
    pipe(writable: StreamWritableNode | StreamWritableWeb): void;
};
