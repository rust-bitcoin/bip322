"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleErrorWithoutErrorPage = void 0;
const stringify_1 = require("@brillout/json-serializer/stringify");
const globalContext_js_1 = require("../globalContext.js");
const utils_js_1 = require("../utils.js");
const createHttpResponseObject_js_1 = require("./createHttpResponseObject.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
// When the user hasn't defined _error.page.js
async function handleErrorWithoutErrorPage(pageContext) {
    (0, utils_js_1.assert)(pageContext._pageId === null);
    (0, utils_js_1.assert)(pageContext.errorWhileRendering || pageContext.is404);
    {
        const isV1 = pageContext._pageConfigs.length > 0;
        warnMissingErrorPage(isV1);
    }
    if (!pageContext.isClientSideNavigation) {
        (0, utils_js_1.objectAssign)(pageContext, { httpResponse: null });
        return pageContext;
    }
    else {
        const __getPageAssets = async () => [];
        (0, utils_js_1.objectAssign)(pageContext, { __getPageAssets });
        const httpResponse = await (0, createHttpResponseObject_js_1.createHttpResponseObject)((0, stringify_1.stringify)({ serverSideError: true }), null, pageContext);
        (0, utils_js_1.objectAssign)(pageContext, { httpResponse });
        return pageContext;
    }
}
exports.handleErrorWithoutErrorPage = handleErrorWithoutErrorPage;
function warnMissingErrorPage(isV1) {
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    if (!globalContext.isProduction) {
        const msg = [
            `No ${isV1 ? 'error page' : picocolors_1.default.cyan('_error.page.js')} found,`,
            'we recommend defining an error page,',
            'see https://vite-plugin-ssr.com/error-page'
        ].join(' ');
        (0, utils_js_1.assertWarning)(false, msg, { onlyOnce: true });
    }
}
