/// <reference types="node" resolution-mode="require"/>
export { isStreamReactStreaming };
export { streamReactStreamingToString };
export { getStreamFromReactStreaming };
export type { StreamReactStreaming };
export type { InjectToStream };
import { StreamReadableWeb, StreamWritableNode } from '../stream.js';
type InjectToStream = (chunk: unknown, options?: {
    flush?: boolean;
}) => void;
type StreamReactStreaming = {
    injectToStream: InjectToStream;
    disabled?: boolean;
} & ({
    pipe: (writable: StreamWritableNode) => void;
    readable: null;
} | {
    pipe: null;
    readable: StreamReadableWeb;
});
declare function streamReactStreamingToString(stream: StreamReactStreaming): Promise<string>;
declare function isStreamReactStreaming(thing: unknown): thing is StreamReactStreaming;
declare function getStreamFromReactStreaming(stream: StreamReactStreaming): StreamReadableWeb | {
    __streamPipeNode: (writable: import("stream").Writable) => void;
};
