"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLoad = void 0;
const assertIsNotBrowser_js_1 = require("../../utils/assertIsNotBrowser.js");
function onLoad() {
    (0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
}
exports.onLoad = onLoad;
