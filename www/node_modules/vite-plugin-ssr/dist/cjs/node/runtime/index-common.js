"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPageRenderer = exports._injectAssets = exports.stampPipe = exports.pipeStream = exports.pipeNodeStream = exports.pipeWebStream = exports.dangerouslySkipEscape = exports.escapeInject = exports.renderPage = void 0;
var renderPage_js_1 = require("./renderPage.js");
Object.defineProperty(exports, "renderPage", { enumerable: true, get: function () { return renderPage_js_1.renderPage; } });
var renderHtml_js_1 = require("./html/renderHtml.js");
Object.defineProperty(exports, "escapeInject", { enumerable: true, get: function () { return renderHtml_js_1.escapeInject; } });
Object.defineProperty(exports, "dangerouslySkipEscape", { enumerable: true, get: function () { return renderHtml_js_1.dangerouslySkipEscape; } });
var stream_js_1 = require("./html/stream.js");
Object.defineProperty(exports, "pipeWebStream", { enumerable: true, get: function () { return stream_js_1.pipeWebStream; } });
Object.defineProperty(exports, "pipeNodeStream", { enumerable: true, get: function () { return stream_js_1.pipeNodeStream; } });
Object.defineProperty(exports, "pipeStream", { enumerable: true, get: function () { return stream_js_1.pipeStream; } });
Object.defineProperty(exports, "stampPipe", { enumerable: true, get: function () { return stream_js_1.stampPipe; } });
// TODO/v1-release: remove
var injectAssets__public_js_1 = require("./html/injectAssets/injectAssets__public.js");
Object.defineProperty(exports, "_injectAssets", { enumerable: true, get: function () { return injectAssets__public_js_1.injectAssets__public; } });
// TODO/v1-release: remove
var createPageRenderer_js_1 = require("../createPageRenderer.js");
Object.defineProperty(exports, "createPageRenderer", { enumerable: true, get: function () { return createPageRenderer_js_1.createPageRenderer; } });
// Help Telefunc detect the user's stack
globalThis._isVitePluginSsr = true;
globalThis._isVike = true;
require("./page-files/setup.js");
