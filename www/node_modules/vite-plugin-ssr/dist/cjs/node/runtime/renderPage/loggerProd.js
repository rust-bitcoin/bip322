"use strict";
// Logger used for the production server.
// Any other environement (dev, preview, build, and pre-rendering) uses loggerNotProd.ts instead.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logErrorProd = void 0;
const abort_js_1 = require("../../../shared/route/abort.js");
const isNewError_js_1 = require("./isNewError.js");
const utils_js_1 = require("../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function logErrorProd(err, _httpRquestId) {
    (0, utils_js_1.warnIfErrorIsNotObject)(err);
    (0, isNewError_js_1.setAlreadyLogged)(err);
    if ((0, abort_js_1.isAbortError)(err)) {
        return;
    }
    // We ensure we print a string; Cloudflare Workers doesn't seem to properly stringify `Error` objects.
    const errStr = (0, utils_js_1.isObject)(err) && 'stack' in err ? String(err.stack) : String(err);
    console.error(picocolors_1.default.red(errStr));
}
exports.logErrorProd = logErrorProd;
