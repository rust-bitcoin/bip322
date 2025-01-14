"use strict";
// Zero-config support for https://www.npmjs.com/package/react-streaming
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStreamFromReactStreaming = exports.streamReactStreamingToString = exports.isStreamReactStreaming = void 0;
const utils_js_1 = require("../../utils.js");
const stream_js_1 = require("../stream.js");
function streamReactStreamingToString(stream) {
    if (stream.pipe) {
        return (0, stream_js_1.streamPipeNodeToString)(stream.pipe);
    }
    if (stream.readable) {
        return (0, stream_js_1.streamReadableWebToString)(stream.readable);
    }
    (0, utils_js_1.assert)(false);
}
exports.streamReactStreamingToString = streamReactStreamingToString;
function isStreamReactStreaming(thing) {
    if ((0, utils_js_1.hasProp)(thing, 'injectToStream', 'function')) {
        return true;
    }
    // TODO
    //if( isStreamPipeNode
    return false;
}
exports.isStreamReactStreaming = isStreamReactStreaming;
function getStreamFromReactStreaming(stream) {
    if (stream.pipe) {
        // TODO
        return { __streamPipeNode: stream.pipe };
    }
    if (stream.readable) {
        return stream.readable;
    }
    (0, utils_js_1.assert)(false);
}
exports.getStreamFromReactStreaming = getStreamFromReactStreaming;
