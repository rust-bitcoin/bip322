"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertOnBeforeRenderHookReturn = void 0;
const utils_js_1 = require("./utils.js");
const assertPageContextProvidedByUser_js_1 = require("./assertPageContextProvidedByUser.js");
const assertHookReturnedObject_js_1 = require("./assertHookReturnedObject.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function assertOnBeforeRenderHookReturn(hookReturnValue, hookFilePath) {
    if (hookReturnValue === undefined || hookReturnValue === null) {
        return;
    }
    const errPrefix = `The onBeforeRender() hook defined by ${hookFilePath}`;
    (0, utils_js_1.assertUsage)((0, utils_js_1.isPlainObject)(hookReturnValue), `${errPrefix} should return a plain JavaScript object, ${picocolors_1.default.cyan('undefined')}, or ${picocolors_1.default.cyan('null')}`);
    (0, assertHookReturnedObject_js_1.assertHookReturnedObject)(hookReturnValue, ['pageContext'], errPrefix);
    if (hookReturnValue.pageContext) {
        (0, assertPageContextProvidedByUser_js_1.assertPageContextProvidedByUser)(hookReturnValue['pageContext'], { hookName: 'onBeforeRender', hookFilePath });
    }
}
exports.assertOnBeforeRenderHookReturn = assertOnBeforeRenderHookReturn;
