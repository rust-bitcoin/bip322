"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.freezePartial = void 0;
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
// Unit tests at ./freezePartial.spec.ts
const assertIsNotBrowser_js_1 = require("./assertIsNotBrowser.js");
(0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
function freezePartial(obj, allowList) {
    Object.entries(obj).forEach(([key, val]) => {
        Object.defineProperty(obj, key, {
            get() {
                return val;
            },
            set(newVal) {
                if (key in allowList) {
                    const isAllowed = allowList[key](newVal);
                    if (isAllowed) {
                        val = newVal;
                        return;
                    }
                    else {
                        throw new Error(`Setting wrong value ${picocolors_1.default.cyan(JSON.stringify(newVal))} for property ${picocolors_1.default.cyan(key)}`);
                    }
                }
                throw new Error(`You aren't allowed to mutate property ${picocolors_1.default.cyan(key)}`);
            },
            configurable: false,
            enumerable: true
        });
    });
    Object.preventExtensions(obj);
}
exports.freezePartial = freezePartial;
