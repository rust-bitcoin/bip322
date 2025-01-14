"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpResponseBodyStreamHandlers = exports.getHttpResponseBody = void 0;
const stream_js_1 = require("../html/stream.js");
const utils_js_1 = require("../utils.js");
const renderHtml_js_1 = require("../html/renderHtml.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const streamDocs = 'See https://vite-plugin-ssr.com/stream for more information.';
function getHttpResponseBody(htmlRender, renderHook) {
    if (typeof htmlRender !== 'string') {
        (0, utils_js_1.assertUsage)(false, getErrMsg(htmlRender, renderHook, 'body', `Use ${picocolors_1.default.cyan('pageContext.httpResponse.pipe()')} or ${picocolors_1.default.cyan('pageContext.httpResponse.getBody()')} instead`));
    }
    const body = htmlRender;
    return body;
}
exports.getHttpResponseBody = getHttpResponseBody;
function getHttpResponseBodyStreamHandlers(htmlRender, renderHook) {
    return {
        async getBody() {
            const body = await (0, renderHtml_js_1.getHtmlString)(htmlRender);
            return body;
        },
        // TODO/v1-release: remove
        async getNodeStream() {
            (0, utils_js_1.assertWarning)(false, '`pageContext.httpResponse.getNodeStream()` is outdated, use `pageContext.httpResponse.pipe()` instead. ' +
                streamDocs, { onlyOnce: true, showStackTrace: true });
            const nodeStream = await (0, stream_js_1.getStreamReadableNode)(htmlRender);
            if (nodeStream === null) {
                (0, utils_js_1.assertUsage)(false, getErrMsg(htmlRender, renderHook, 'getNodeStream()', getFixMsg('readable', 'node')));
            }
            return nodeStream;
        },
        // TODO/v1-release: remove
        getWebStream() {
            (0, utils_js_1.assertWarning)(false, '`pageContext.httpResponse.getWebStream(res)` is outdated, use `pageContext.httpResponse.getReadableWebStream(res)` instead. ' +
                streamDocs, { onlyOnce: true, showStackTrace: true });
            const webStream = (0, stream_js_1.getStreamReadableWeb)(htmlRender);
            if (webStream === null) {
                (0, utils_js_1.assertUsage)(false, getErrMsg(htmlRender, renderHook, 'getWebStream()', getFixMsg('readable', 'web')));
            }
            return webStream;
        },
        getReadableWebStream() {
            const webStream = (0, stream_js_1.getStreamReadableWeb)(htmlRender);
            if (webStream === null) {
                (0, utils_js_1.assertUsage)(false, getErrMsg(htmlRender, renderHook, 'getReadableWebStream()', getFixMsg('readable', 'web')));
            }
            return webStream;
        },
        // TODO/v1-release: remove
        pipeToWebWritable(writable) {
            (0, utils_js_1.assertWarning)(false, '`pageContext.httpResponse.pipeToWebWritable(res)` is outdated, use `pageContext.httpResponse.pipe(res)` instead. ' +
                streamDocs, { onlyOnce: true, showStackTrace: true });
            const success = (0, stream_js_1.pipeToStreamWritableWeb)(htmlRender, writable);
            if (!success) {
                (0, utils_js_1.assertUsage)(false, getErrMsg(htmlRender, renderHook, 'pipeToWebWritable()'));
            }
        },
        // TODO/v1-release: remove
        pipeToNodeWritable(writable) {
            (0, utils_js_1.assertWarning)(false, '`pageContext.httpResponse.pipeToNodeWritable(res)` is outdated, use `pageContext.httpResponse.pipe(res)` instead. ' +
                streamDocs, { onlyOnce: true, showStackTrace: true });
            const success = (0, stream_js_1.pipeToStreamWritableNode)(htmlRender, writable);
            if (!success) {
                (0, utils_js_1.assertUsage)(false, getErrMsg(htmlRender, renderHook, 'pipeToNodeWritable()'));
            }
        },
        pipe(writable) {
            const getErrMsgMixingStreamTypes = (writableType) => `The ${getErrMsgBody(htmlRender, renderHook)} while a ${writableType} was passed to pageContext.httpResponse.pipe() which is contradictory. You cannot mix a Web Stream with a Node.js Stream.`;
            if ((0, stream_js_1.isStreamWritableWeb)(writable)) {
                const success = (0, stream_js_1.pipeToStreamWritableWeb)(htmlRender, writable);
                if (success) {
                    return;
                }
                else {
                    (0, utils_js_1.assert)((0, stream_js_1.isStreamReadableWeb)(htmlRender) || (0, stream_js_1.isStreamPipeWeb)(htmlRender));
                    (0, utils_js_1.assertUsage)(false, getErrMsgMixingStreamTypes('Web Writable'));
                }
            }
            if ((0, stream_js_1.isStreamWritableNode)(writable)) {
                const success = (0, stream_js_1.pipeToStreamWritableNode)(htmlRender, writable);
                if (success) {
                    return;
                }
                else {
                    (0, utils_js_1.assert)((0, stream_js_1.isStreamReadableNode)(htmlRender) || (0, stream_js_1.isStreamPipeNode)(htmlRender));
                    (0, utils_js_1.assertUsage)(false, getErrMsgMixingStreamTypes('Node.js Writable'));
                }
            }
            (0, utils_js_1.assertUsage)(false, `The argument ${picocolors_1.default.cyan('writable')} passed to ${picocolors_1.default.cyan('pageContext.httpResponse.pipe(writable)')} doesn't seem to be ${(0, stream_js_1.getStreamName)('writable', 'web')} nor ${(0, stream_js_1.getStreamName)('writable', 'node')}.`);
        }
    };
    function getFixMsg(type, standard) {
        const streamName = (0, stream_js_1.getStreamName)(type, standard);
        (0, utils_js_1.assert)(['a ', 'an ', 'the '].some((s) => streamName.startsWith(s)));
        (0, utils_js_1.assert)(renderHook);
        const { hookFilePath, hookName } = renderHook;
        return `Make sure the ${hookName}() defined by ${hookFilePath} hook provides ${streamName} instead`;
    }
}
exports.getHttpResponseBodyStreamHandlers = getHttpResponseBodyStreamHandlers;
function getErrMsg(htmlRender, renderHook, method, msgAddendum) {
    (0, utils_js_1.assert)(!msgAddendum || !msgAddendum.endsWith('.'));
    const errMsgBody = getErrMsgBody(htmlRender, renderHook);
    return [`pageContext.httpResponse.${method} can't be used because the ${errMsgBody}`, msgAddendum, streamDocs]
        .filter(Boolean)
        .join('. ');
}
function getErrMsgBody(htmlRender, renderHook) {
    (0, utils_js_1.assert)(renderHook);
    const { hookFilePath, hookName } = renderHook;
    const hookReturnType = getHookReturnType(htmlRender);
    (0, utils_js_1.assert)(['a ', 'an ', 'the '].some((s) => hookReturnType.startsWith(s)));
    const errMsgBody = `${hookName}()\ hook defined by ${hookFilePath} provides ${hookReturnType}`;
    (0, utils_js_1.assert)(!errMsgBody.endsWith(' '));
    return errMsgBody;
}
function getHookReturnType(htmlRender) {
    if (typeof htmlRender === 'string') {
        return 'an HTML string';
    }
    else if ((0, stream_js_1.isStream)(htmlRender)) {
        return (0, stream_js_1.inferStreamName)(htmlRender);
    }
    else {
        (0, utils_js_1.assert)(false);
    }
}
