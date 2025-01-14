// Zero-config support for https://www.npmjs.com/package/react-streaming
export { isStreamReactStreaming };
export { streamReactStreamingToString };
export { getStreamFromReactStreaming };
import { assert, hasProp } from '../../utils.js';
import { streamPipeNodeToString, streamReadableWebToString } from '../stream.js';
function streamReactStreamingToString(stream) {
    if (stream.pipe) {
        return streamPipeNodeToString(stream.pipe);
    }
    if (stream.readable) {
        return streamReadableWebToString(stream.readable);
    }
    assert(false);
}
function isStreamReactStreaming(thing) {
    if (hasProp(thing, 'injectToStream', 'function')) {
        return true;
    }
    // TODO
    //if( isStreamPipeNode
    return false;
}
function getStreamFromReactStreaming(stream) {
    if (stream.pipe) {
        // TODO
        return { __streamPipeNode: stream.pipe };
    }
    if (stream.readable) {
        return stream.readable;
    }
    assert(false);
}
