"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStreamWritableNode = exports.isStreamWritableWeb = exports.streamPipeNodeToString = exports.streamReadableWebToString = exports.inferStreamName = exports.getStreamName = exports.isStreamReadableNode = exports.isStreamReadableWeb = exports.isStreamPipeNode = exports.isStreamPipeWeb = exports.isStream = exports.pipeToStreamWritableWeb = exports.pipeToStreamWritableNode = exports.getStreamReadableWeb = exports.getStreamReadableNode = exports.pipeNodeStream = exports.pipeWebStream = exports.pipeStream = exports.stampPipe = exports.streamToString = exports.processStream = void 0;
const utils_js_1 = require("../utils.js");
const react_streaming_js_1 = require("./stream/react-streaming.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const debug = (0, utils_js_1.createDebugger)('vps:stream');
function isStreamReadableWeb(thing) {
    return typeof ReadableStream !== 'undefined' && thing instanceof ReadableStream;
}
exports.isStreamReadableWeb = isStreamReadableWeb;
function isStreamWritableWeb(thing) {
    return typeof WritableStream !== 'undefined' && thing instanceof WritableStream;
}
exports.isStreamWritableWeb = isStreamWritableWeb;
function isStreamReadableNode(thing) {
    if (isStreamReadableWeb(thing)) {
        return false;
    }
    // https://stackoverflow.com/questions/17009975/how-to-test-if-an-object-is-a-stream-in-nodejs/37022523#37022523
    return (0, utils_js_1.hasProp)(thing, 'read', 'function');
}
exports.isStreamReadableNode = isStreamReadableNode;
function isStreamWritableNode(thing) {
    if (isStreamWritableWeb(thing)) {
        return false;
    }
    // https://stackoverflow.com/questions/17009975/how-to-test-if-an-object-is-a-stream-in-nodejs/37022523#37022523
    return (0, utils_js_1.hasProp)(thing, 'write', 'function');
}
exports.isStreamWritableNode = isStreamWritableNode;
async function streamReadableNodeToString(readableNode) {
    // Copied from: https://stackoverflow.com/questions/10623798/how-do-i-read-the-contents-of-a-node-js-stream-into-a-string-variable/49428486#49428486
    const chunks = [];
    return new Promise((resolve, reject) => {
        readableNode.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        readableNode.on('error', (err) => reject(err));
        readableNode.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}
async function streamReadableWebToString(readableWeb) {
    let str = '';
    const reader = readableWeb.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        str += value;
    }
    return str;
}
exports.streamReadableWebToString = streamReadableWebToString;
async function stringToStreamReadableNode(str) {
    const { Readable } = await loadStreamNodeModule();
    return Readable.from(str);
}
function stringToStreamReadableWeb(str) {
    // ReadableStream.from() spec discussion: https://github.com/whatwg/streams/issues/1018
    assertReadableStreamConstructor();
    const readableStream = new ReadableStream({
        start(controller) {
            controller.enqueue(encodeForWebStream(str));
            controller.close();
        }
    });
    return readableStream;
}
function stringToStreamPipeNode(str) {
    return (writable) => {
        writable.write(str);
        writable.end();
    };
}
function stringToStreamPipeWeb(str) {
    return (writable) => {
        const writer = writable.getWriter();
        writer.write(encodeForWebStream(str));
        writer.close();
    };
}
async function streamPipeNodeToString(streamPipeNode) {
    let str = '';
    let resolve;
    let reject;
    const promise = new Promise((resolve_, reject_) => {
        resolve = () => resolve_(str);
        reject = reject_;
    });
    const { Writable } = await loadStreamNodeModule();
    const writable = new Writable({
        write(chunk, _encoding, callback) {
            const s = chunk.toString();
            (0, utils_js_1.assert)(typeof s === 'string');
            str += s;
            callback();
        },
        final(callback) {
            resolve();
            callback();
        },
        destroy(err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        }
    });
    streamPipeNode(writable);
    return promise;
}
exports.streamPipeNodeToString = streamPipeNodeToString;
function streamPipeWebToString(streamPipeWeb) {
    let str = '';
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    const writable = new WritableStream({
        write(chunk) {
            (0, utils_js_1.assert)(typeof chunk === 'string');
            str += chunk;
        },
        close() {
            resolve(str);
        }
    });
    streamPipeWeb(writable);
    return promise;
}
async function getStreamReadableNode(htmlRender) {
    if (typeof htmlRender === 'string') {
        return stringToStreamReadableNode(htmlRender);
    }
    if (isStreamReadableNode(htmlRender)) {
        return htmlRender;
    }
    return null;
}
exports.getStreamReadableNode = getStreamReadableNode;
function getStreamReadableWeb(htmlRender) {
    if (typeof htmlRender === 'string') {
        return stringToStreamReadableWeb(htmlRender);
    }
    if (isStreamReadableWeb(htmlRender)) {
        return htmlRender;
    }
    return null;
}
exports.getStreamReadableWeb = getStreamReadableWeb;
function pipeToStreamWritableWeb(htmlRender, writable) {
    if (typeof htmlRender === 'string') {
        const streamPipeWeb = stringToStreamPipeWeb(htmlRender);
        streamPipeWeb(writable);
        return true;
    }
    if (isStreamReadableWeb(htmlRender)) {
        htmlRender.pipeTo(writable);
        return true;
    }
    if (isStreamPipeWeb(htmlRender)) {
        const streamPipeWeb = getStreamPipeWeb(htmlRender);
        (0, utils_js_1.assert)(streamPipeWeb);
        streamPipeWeb(writable);
        return true;
    }
    if (isStreamReadableNode(htmlRender) || isStreamPipeNode(htmlRender)) {
        return false;
    }
    (0, utils_js_1.checkType)(htmlRender);
    (0, utils_js_1.assert)(false);
}
exports.pipeToStreamWritableWeb = pipeToStreamWritableWeb;
function pipeToStreamWritableNode(htmlRender, writable) {
    if (typeof htmlRender === 'string') {
        const streamPipeNode = stringToStreamPipeNode(htmlRender);
        streamPipeNode(writable);
        return true;
    }
    if (isStreamReadableNode(htmlRender)) {
        htmlRender.pipe(writable);
        return true;
    }
    if (isStreamPipeNode(htmlRender)) {
        const streamPipeNode = getStreamPipeNode(htmlRender);
        (0, utils_js_1.assert)(streamPipeNode);
        streamPipeNode(writable);
        return true;
    }
    if (isStreamReadableWeb(htmlRender) || isStreamPipeWeb(htmlRender)) {
        return false;
    }
    (0, utils_js_1.checkType)(htmlRender);
    (0, utils_js_1.assert)(false);
}
exports.pipeToStreamWritableNode = pipeToStreamWritableNode;
async function processStream(streamOriginal, { injectStringAtBegin, injectStringAtEnd, onErrorWhileStreaming, enableEagerStreaming }) {
    const buffer = [];
    let streamOriginalHasStartedEmitting = false;
    let streamEnded = false;
    let isReadyToWrite = false;
    let wrapperCreated = false;
    let shouldFlushStream = false;
    let resolve;
    let reject;
    let promiseHasResolved = false;
    const streamWrapperPromise = new Promise((resolve_, reject_) => {
        resolve = (streamWrapper) => {
            promiseHasResolved = true;
            resolve_(streamWrapper);
        };
        reject = (err) => {
            promiseHasResolved = true;
            reject_(err);
        };
    });
    let resolveReadyToWrite;
    const promiseReadyToWrite = new Promise((r) => (resolveReadyToWrite = r));
    if (injectStringAtBegin) {
        const injectionBegin = await injectStringAtBegin();
        writeStream(injectionBegin); // Adds injectionBegin to buffer
        flushStream(); // Sets shouldFlushStream to true
    }
    const { streamWrapper, streamWrapperOperations } = await createStreamWrapper({
        streamOriginal,
        onReadyToWrite() {
            debug('stream begin');
            isReadyToWrite = true;
            flushBuffer();
            resolveReadyToWrite();
        },
        onError(err) {
            if (!promiseHasResolved) {
                reject(err);
            }
            else {
                onErrorWhileStreaming(err);
            }
        },
        onData(chunk) {
            (0, utils_js_1.assert)(streamEnded === false);
            streamOriginalHasStartedEmitting = true;
            writeStream(chunk);
            if (wrapperCreated)
                resolvePromise();
        },
        async onEnd() {
            try {
                debug('stream end');
                streamEnded = true;
                streamOriginalHasStartedEmitting = true; // In case original stream (stream provided by user) emits no data
                if (wrapperCreated)
                    resolvePromise(); //    In case original stream (stream provided by user) emits no data
                if (injectStringAtEnd) {
                    const injectEnd = await injectStringAtEnd();
                    writeStream(injectEnd);
                }
                await promiseReadyToWrite; // E.g. if the user calls the pipe wrapper after the original writable has ended
                (0, utils_js_1.assert)(isReady());
                flushBuffer();
                debug('stream ended');
            }
            catch (err) {
                // We should catch and gracefully handle user land errors, as any error thrown here kills the server
                if (!(0, utils_js_1.isBug)(err)) {
                    console.error(err);
                    (0, utils_js_1.assert)(false);
                }
                throw err;
            }
        },
        onFlush() {
            flushStream();
        }
    });
    wrapperCreated = true;
    flushBuffer(); // In case onReadyToWrite() was already called (the flushBuffer() of onReadyToWrite() wasn't called because `wrapperCreated === false`)
    if (!delayStreamStart())
        resolvePromise();
    return streamWrapperPromise;
    function writeStream(chunk) {
        buffer.push(chunk);
        flushBuffer();
    }
    function flushBuffer() {
        if (!isReady())
            return;
        buffer.forEach((chunk) => {
            streamWrapperOperations.writeChunk(chunk);
        });
        buffer.length = 0;
        if (shouldFlushStream)
            flushStream();
    }
    function resolvePromise() {
        (0, utils_js_1.assert)(!delayStreamStart()); // The stream promise shouldn't resolve before delayStreamStart()
        (0, utils_js_1.assert)(wrapperCreated); // Doesn't make sense to resolve streamWrapper if it isn't defined yet
        debug('stream promise resolved');
        resolve(streamWrapper);
    }
    function flushStream() {
        if (!isReady()) {
            shouldFlushStream = true;
            return;
        }
        if (streamWrapperOperations.flushStream === null)
            return;
        streamWrapperOperations.flushStream();
        shouldFlushStream = false;
        debug('stream flushed');
    }
    function isReady() {
        /*
        console.log('isReadyToWrite', isReadyToWrite)
        console.log('wrapperCreated', wrapperCreated)
        console.log('!delayStreamStart()', !delayStreamStart())
        */
        return (isReadyToWrite &&
            // We can't use streamWrapperOperations.writeChunk() if it isn't defined yet
            wrapperCreated &&
            // See comment below
            !delayStreamStart());
    }
    // Delay streaming, so that if the page shell fails then VPS is able to render the error page.
    //  - We can't erase the previously written stream data => we need to delay streaming if we want to be able to restart rendering anew for the error page
    //  - This is what React expects.
    //  - Does this make sense for UI frameworks other than React?
    //  - We don't need this anymore if we implement a client-side recover mechanism.
    //     - I.e. rendering the error page on the client-side if there is an error during the stream.
    //       - We cannot do this with Server Routing
    //     - Emitting the wrong status code doesn't matter with libraries like react-streaming which automatically disable streaming for bots. (Emitting the right status code only matters for bots.)
    function delayStreamStart() {
        return !enableEagerStreaming && !streamOriginalHasStartedEmitting;
    }
}
exports.processStream = processStream;
async function createStreamWrapper({ streamOriginal, onError, onData, onEnd, onFlush, onReadyToWrite }) {
    if ((0, react_streaming_js_1.isStreamReactStreaming)(streamOriginal)) {
        debug(`onRenderHtml() hook returned ${picocolors_1.default.cyan('react-streaming')} result`);
        const stream = (0, react_streaming_js_1.getStreamFromReactStreaming)(streamOriginal);
        streamOriginal = stream;
    }
    if (isStreamPipeNode(streamOriginal)) {
        debug('onRenderHtml() hook returned Node.js Stream Pipe');
        let writableOriginal = null;
        const pipeProxy = (writable_) => {
            writableOriginal = writable_;
            debug('original Node.js Writable received');
            onReadyToWrite();
            if (hasEnded) {
                // onReadyToWrite() already wrote everything; we can close the stream right away
                writableOriginal.end();
            }
        };
        stampPipe(pipeProxy, 'node-stream');
        const writeChunk = (chunk) => {
            (0, utils_js_1.assert)(writableOriginal);
            writableOriginal.write(chunk);
            if (debug.isEnabled) {
                debug('data written (Node.js Writable)', String(chunk));
            }
        };
        // For libraries such as https://www.npmjs.com/package/compression
        //  - React calls writable.flush() when available
        //  - https://github.com/brillout/vite-plugin-ssr/issues/466#issuecomment-1269601710
        const flushStream = () => {
            (0, utils_js_1.assert)(writableOriginal);
            if (typeof writableOriginal.flush === 'function') {
                writableOriginal.flush();
                debug('stream flush() performed (Node.js Writable)');
            }
        };
        let hasEnded = false;
        const endStream = () => {
            hasEnded = true;
            if (writableOriginal) {
                writableOriginal.end();
            }
        };
        const { Writable } = await loadStreamNodeModule();
        const writableProxy = new Writable({
            async write(chunk, _encoding, callback) {
                onData(chunk);
                callback();
            },
            async destroy(err, callback) {
                if (err) {
                    onError(err);
                }
                else {
                    await onEnd();
                }
                callback(err);
                endStream();
            }
        });
        // Forward the flush() call
        (0, utils_js_1.objectAssign)(writableProxy, {
            flush: () => {
                onFlush();
            }
        });
        (0, utils_js_1.assert)(typeof writableProxy.flush === 'function');
        const pipeOriginal = getStreamPipeNode(streamOriginal);
        pipeOriginal(writableProxy);
        return { streamWrapper: pipeProxy, streamWrapperOperations: { writeChunk, flushStream } };
    }
    if (isStreamPipeWeb(streamOriginal)) {
        debug('onRenderHtml() hook returned Web Stream Pipe');
        let writerOriginal = null;
        const pipeProxy = (writableOriginal) => {
            writerOriginal = writableOriginal.getWriter();
            debug('original Web Writable received');
            (async () => {
                // CloudFlare Workers does not implement `ready` property
                //  - https://github.com/vuejs/vue-next/issues/4287
                try {
                    await writerOriginal.ready;
                }
                catch (e) { }
                onReadyToWrite();
                if (hasEnded) {
                    // onReadyToWrite() already wrote everything; we can close the stream right away
                    writerOriginal.close();
                }
            })();
        };
        stampPipe(pipeProxy, 'web-stream');
        const writeChunk = (chunk) => {
            (0, utils_js_1.assert)(writerOriginal);
            writerOriginal.write(encodeForWebStream(chunk));
            if (debug.isEnabled) {
                debug('data written (Web Writable)', String(chunk));
            }
        };
        // Web Streams have compression built-in
        //  - https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API
        //  - It seems that there is no flush interface? Flushing just works automagically?
        const flushStream = null;
        let hasEnded = false;
        const endStream = () => {
            hasEnded = true;
            if (writerOriginal) {
                writerOriginal.close();
            }
        };
        let writableProxy;
        if (typeof ReadableStream !== 'function') {
            writableProxy = new WritableStream({
                write(chunk) {
                    onData(chunk);
                },
                async close() {
                    await onEnd();
                    endStream();
                },
                abort(err) {
                    onError(err);
                    endStream();
                }
            });
        }
        else {
            const { readable, writable } = new TransformStream();
            writableProxy = writable;
            handleReadableWeb(readable, {
                onData,
                onError(err) {
                    onError(err);
                    endStream();
                },
                async onEnd() {
                    await onEnd();
                    endStream();
                }
            });
        }
        const pipeOriginal = getStreamPipeWeb(streamOriginal);
        pipeOriginal(writableProxy);
        return { streamWrapper: pipeProxy, streamWrapperOperations: { writeChunk, flushStream } };
    }
    if (isStreamReadableWeb(streamOriginal)) {
        debug('onRenderHtml() hook returned Web Readable');
        const readableOriginal = streamOriginal;
        let controllerProxy;
        assertReadableStreamConstructor();
        const readableProxy = new ReadableStream({
            start(controller) {
                controllerProxy = controller;
                onReadyToWrite();
                handleReadableWeb(readableOriginal, {
                    onData,
                    onError(err) {
                        onError(err);
                        controllerProxy.close();
                    },
                    async onEnd() {
                        await onEnd();
                        controllerProxy.close();
                    }
                });
            }
        });
        const writeChunk = (chunk) => {
            controllerProxy.enqueue(encodeForWebStream(chunk));
            if (debug.isEnabled) {
                debug('data written (Web Readable)', String(chunk));
            }
        };
        // Readables don't have the notion of flushing
        const flushStream = null;
        return {
            streamWrapper: readableProxy,
            streamWrapperOperations: { writeChunk, flushStream }
        };
    }
    if (isStreamReadableNode(streamOriginal)) {
        debug('onRenderHtml() hook returned Node.js Readable');
        const readableOriginal = streamOriginal;
        const { Readable } = await loadStreamNodeModule();
        // Vue doesn't always set the read() handler: https://github.com/brillout/vite-plugin-ssr/issues/138#issuecomment-934743375
        if (readableOriginal._read === Readable.prototype._read) {
            readableOriginal._read = function () { };
        }
        const writeChunk = (chunk) => {
            readableProxy.push(chunk);
            if (debug.isEnabled) {
                debug('data written (Node.js Readable)', String(chunk));
            }
        };
        // Readables don't have the notion of flushing
        const flushStream = null;
        const closeProxy = () => {
            readableProxy.push(null);
        };
        const readableProxy = new Readable({ read() { } });
        onReadyToWrite();
        readableOriginal.on('data', (chunk) => {
            onData(chunk);
        });
        readableOriginal.on('error', (err) => {
            onError(err);
            closeProxy();
        });
        readableOriginal.on('end', async () => {
            await onEnd();
            closeProxy();
        });
        return {
            streamWrapper: readableProxy,
            streamWrapperOperations: { writeChunk, flushStream }
        };
    }
    (0, utils_js_1.assert)(false);
}
async function handleReadableWeb(readable, { onData, onError, onEnd }) {
    const reader = readable.getReader();
    while (true) {
        let result;
        try {
            result = await reader.read();
        }
        catch (err) {
            onError(err);
            return;
        }
        const { value, done } = result;
        if (done) {
            break;
        }
        onData(value);
    }
    await onEnd();
}
function isStream(something) {
    if (isStreamReadableWeb(something) ||
        isStreamReadableNode(something) ||
        isStreamPipeNode(something) ||
        isStreamPipeWeb(something) ||
        (0, react_streaming_js_1.isStreamReactStreaming)(something)) {
        (0, utils_js_1.checkType)(something);
        return true;
    }
    return false;
}
exports.isStream = isStream;
const __streamPipeWeb = '__streamPipeWeb';
/** @deprecated */
function pipeWebStream(pipe) {
    (0, utils_js_1.assertWarning)(false, 'pipeWebStream() is outdated, use stampPipe() instead. See https://vite-plugin-ssr.com/stream', {
        onlyOnce: true,
        showStackTrace: true
    });
    return { [__streamPipeWeb]: pipe };
}
exports.pipeWebStream = pipeWebStream;
function getStreamPipeWeb(thing) {
    if (!isStreamPipeWeb(thing)) {
        return null;
    }
    if ((0, utils_js_1.isObject)(thing)) {
        // pipeWebStream()
        (0, utils_js_1.assert)(__streamPipeWeb && thing);
        return thing[__streamPipeWeb];
    }
    else {
        // stampPipe()
        (0, utils_js_1.assert)((0, utils_js_1.isCallable)(thing) && 'isWebStreamPipe' in thing);
        return thing;
    }
}
function isStreamPipeWeb(thing) {
    // pipeWebStream()
    if ((0, utils_js_1.isObject)(thing) && __streamPipeWeb in thing) {
        return true;
    }
    // stampPipe()
    if ((0, utils_js_1.isCallable)(thing) && 'isWebStreamPipe' in thing) {
        return true;
    }
    return false;
}
exports.isStreamPipeWeb = isStreamPipeWeb;
const __streamPipeNode = '__streamPipeNode';
/** @deprecated */
function pipeNodeStream(pipe) {
    (0, utils_js_1.assertWarning)(false, 'pipeNodeStream() is outdated, use stampPipe() instead. See https://vite-plugin-ssr.com/stream', { onlyOnce: true, showStackTrace: true });
    return { [__streamPipeNode]: pipe };
}
exports.pipeNodeStream = pipeNodeStream;
function getStreamPipeNode(thing) {
    if (!isStreamPipeNode(thing)) {
        return null;
    }
    if ((0, utils_js_1.isObject)(thing)) {
        // pipeNodeStream()
        (0, utils_js_1.assert)(__streamPipeNode in thing);
        return thing[__streamPipeNode];
    }
    else {
        // stampPipe()
        (0, utils_js_1.assert)((0, utils_js_1.isCallable)(thing) && 'isNodeStreamPipe' in thing);
        return thing;
    }
}
function isStreamPipeNode(thing) {
    // pipeNodeStream()
    if ((0, utils_js_1.isObject)(thing) && __streamPipeNode in thing) {
        return true;
    }
    // stampPipe()
    if ((0, utils_js_1.isCallable)(thing) && 'isNodeStreamPipe' in thing) {
        return true;
    }
    return false;
}
exports.isStreamPipeNode = isStreamPipeNode;
function stampPipe(pipe, pipeType) {
    (0, utils_js_1.assertUsage)(pipeType, `stampPipe(pipe, pipeType): argument ${picocolors_1.default.cyan('pipeType')} is missing.)`, {
        showStackTrace: true
    });
    (0, utils_js_1.assertUsage)(['web-stream', 'node-stream'].includes(pipeType), `stampPipe(pipe, pipeType): argument ${picocolors_1.default.cyan('pipeType')} should be either ${picocolors_1.default.cyan("'web-stream'")} or ${picocolors_1.default.cyan("'node-stream'")}.`, { showStackTrace: true });
    if (pipeType === 'node-stream') {
        Object.assign(pipe, { isNodeStreamPipe: true });
    }
    else {
        Object.assign(pipe, { isWebStreamPipe: true });
    }
}
exports.stampPipe = stampPipe;
const __streamPipe = '__streamPipe';
function pipeStream(pipe) {
    return { [__streamPipe]: pipe };
}
exports.pipeStream = pipeStream;
async function streamToString(stream) {
    if (isStreamReadableWeb(stream)) {
        return await streamReadableWebToString(stream);
    }
    if (isStreamReadableNode(stream)) {
        return await streamReadableNodeToString(stream);
    }
    if (isStreamPipeNode(stream)) {
        return await streamPipeNodeToString(getStreamPipeNode(stream));
    }
    if (isStreamPipeWeb(stream)) {
        return await streamPipeWebToString(getStreamPipeWeb(stream));
    }
    if ((0, react_streaming_js_1.isStreamReactStreaming)(stream)) {
        return await (0, react_streaming_js_1.streamReactStreamingToString)(stream);
    }
    (0, utils_js_1.assert)(false);
}
exports.streamToString = streamToString;
function assertReadableStreamConstructor() {
    (0, utils_js_1.assertUsage)(typeof ReadableStream === 'function', 
    // Error message copied from vue's renderToWebStream() implementation
    "ReadableStream constructor isn't available in the global scope. " +
        'If the target environment does support web streams, consider using ' +
        'pipeToWebWritable() with an existing WritableStream instance instead.');
}
let encoder;
function encodeForWebStream(thing) {
    if (!encoder) {
        encoder = new TextEncoder();
    }
    if (typeof thing === 'string') {
        return encoder.encode(thing);
    }
    return thing;
}
// Because of Cloudflare Workers, we cannot statically import the `stream` module, instead we dynamically import it.
async function loadStreamNodeModule() {
    const streamModule = await (0, utils_js_1.dynamicImport)('stream');
    const { Readable, Writable } = streamModule;
    return { Readable, Writable };
}
function getStreamName(type, standard) {
    let standardName = (0, utils_js_1.capitalizeFirstLetter)(standard);
    if (standardName === 'Node') {
        standardName = 'Node.js';
    }
    const typeName = (0, utils_js_1.capitalizeFirstLetter)(type);
    if (type !== 'pipe') {
        return `a ${typeName} ${standardName} Stream`;
    }
    if (type === 'pipe') {
        return `a ${standardName} Stream Pipe`;
    }
    (0, utils_js_1.assert)(false);
}
exports.getStreamName = getStreamName;
function inferStreamName(stream) {
    if (isStreamReadableWeb(stream)) {
        return getStreamName('readable', 'web');
    }
    if (isStreamReadableNode(stream)) {
        return getStreamName('readable', 'node');
    }
    if (isStreamPipeNode(stream)) {
        return getStreamName('pipe', 'node');
    }
    if (isStreamPipeWeb(stream)) {
        return getStreamName('pipe', 'web');
    }
    (0, utils_js_1.assert)(false);
}
exports.inferStreamName = inferStreamName;
