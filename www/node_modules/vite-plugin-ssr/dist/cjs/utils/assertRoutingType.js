"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfClientRouting = exports.assertServerRouting = exports.assertClientRouting = void 0;
const assert_js_1 = require("./assert.js");
const getGlobalObject_js_1 = require("./getGlobalObject.js");
const isBrowser_js_1 = require("./isBrowser.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const state = (0, getGlobalObject_js_1.getGlobalObject)('utils/assertRouterType.ts', {});
function assertClientRouting() {
    assertNoContradiction(checkIfClientRouting());
    state.isClientRouting = true;
}
exports.assertClientRouting = assertClientRouting;
function checkIfClientRouting() {
    return state.isClientRouting !== false;
}
exports.checkIfClientRouting = checkIfClientRouting;
function assertServerRouting() {
    assertNoContradiction(state.isClientRouting !== true);
    state.isClientRouting = false;
}
exports.assertServerRouting = assertServerRouting;
function assertNoContradiction(noContradiction) {
    // If an assertion fails because of a wrong usage, then we assume that the user is trying to import from 'vite-plugin-ssr/client/router' while not setting `clientRouting` to `true`. Note that 'vite-plugin-ssr/client' only exports the type `PageContextBuiltInClient` and that the package.json#exports entry 'vite-plugin-ssr/client' will eventually be removed.
    (0, assert_js_1.assertUsage)((0, isBrowser_js_1.isBrowser)(), `${picocolors_1.default.cyan("import { something } from 'vite-plugin-ssr/client/router'")} is forbidden on the server-side`, { showStackTrace: true });
    (0, assert_js_1.assertWarning)(noContradiction, "You shouldn't `import { something } from 'vite-plugin-ssr/client/router'` when using Server Routing. The 'vite-plugin-ssr/client/router' utilities work only with Client Routing. In particular, don't `import { navigate }` nor `import { prefetch }` as they unnecessarily bloat your client-side bundle sizes.", { showStackTrace: true, onlyOnce: true });
}
