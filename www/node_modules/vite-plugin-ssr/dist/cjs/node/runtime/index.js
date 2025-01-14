"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./index-common.js"), exports);
const utils_js_1 = require("./utils.js");
(0, utils_js_1.assertUsage)(!(0, utils_js_1.isBrowser)(), "It's forbidden to `import { something } from 'vite-plugin-ssr/server'` in code loaded on the client-side: the module 'vite-plugin-ssr/server' is a server-only module.", { showStackTrace: true });
(0, utils_js_1.assertWarning)(false, 'The vite-plugin-ssr project has been renamed to Vike, see https://vite-plugin-ssr.com/vike', {
    onlyOnce: true
});
