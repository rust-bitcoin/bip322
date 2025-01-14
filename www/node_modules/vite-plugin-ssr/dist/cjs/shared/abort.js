"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = exports.redirect = void 0;
// TODO/v1-release: Move all universal imports (when using Client Routing) to:
//   import {
//     redirect,
//     render,
//     resolveRoute,
//     navigate,
//     prefetch,
//   } from 'vite-plugin-ssr'
// Use package.json#exports to make the imports isomorphic.
// The client-side has no utility when using Server Routing.
var abort_js_1 = require("./route/abort.js");
Object.defineProperty(exports, "redirect", { enumerable: true, get: function () { return abort_js_1.redirect; } });
Object.defineProperty(exports, "render", { enumerable: true, get: function () { return abort_js_1.render; } });
