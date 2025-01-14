"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnIfErrorIsNotObject = void 0;
const assert_js_1 = require("./assert.js");
const assertIsNotBrowser_js_1 = require("./assertIsNotBrowser.js");
const isObject_js_1 = require("./isObject.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
(0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
// It would be cleaner to:
//  - Call assertUsageErrorIsObject() right after calling the user's hook
//    - Attach the original error: assertUsageError.originalErrorValue = err
//      - Show the original error in vite-plugin-ssr's error handling
//  - Use assertErrorIsObject() throughout Vike's source code
function warnIfErrorIsNotObject(err) {
    if (!(0, isObject_js_1.isObject)(err)) {
        console.warn('[vite-plugin-ssr] The thrown value is:');
        console.warn(err);
        (0, assert_js_1.assertWarning)(false, `One of your hooks threw an error ${picocolors_1.default.cyan('throw someValue')} but ${picocolors_1.default.cyan('someValue')} isn't an object (it's ${picocolors_1.default.cyan(`typeof someValue === ${typeof err}`)} instead). Make sure thrown values are always wrapped with ${picocolors_1.default.cyan('new Error()')}, in other words: ${picocolors_1.default.cyan('throw someValue')} should be replaced with ${picocolors_1.default.cyan('throw new Error(someValue)')}. The thrown value is printed above.`, { onlyOnce: false });
    }
}
exports.warnIfErrorIsNotObject = warnIfErrorIsNotObject;
