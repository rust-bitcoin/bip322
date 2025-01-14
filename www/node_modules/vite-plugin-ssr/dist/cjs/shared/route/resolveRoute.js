"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRoute = void 0;
const utils_js_1 = require("./utils.js");
const resolveRouteString_js_1 = require("./resolveRouteString.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function resolveRoute(routeString, urlPathname) {
    const errMsg = (propName, msg = 'a non-empty string') => `[resolveRoute(routeString, urlPathname)] ${picocolors_1.default.cyan(propName)} should be ` + msg;
    (0, utils_js_1.assertUsage)(routeString, errMsg('routeString'), { showStackTrace: true });
    (0, utils_js_1.assertUsage)(urlPathname, errMsg('urlPathname'), { showStackTrace: true });
    (0, utils_js_1.assertUsage)(urlPathname.startsWith('/'), errMsg('urlPathname', 'pageContext.urlPathname'), { showStackTrace: true });
    const result = (0, resolveRouteString_js_1.resolveRouteString)(routeString, urlPathname);
    return {
        match: !!result,
        routeParams: result?.routeParams ?? {}
    };
}
exports.resolveRoute = resolveRoute;
