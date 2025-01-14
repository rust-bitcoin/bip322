"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnDeprecatedAllowKey = exports.assertSyncRouting = exports.assertRouteParams = exports.resolveRouteFunction = void 0;
const addUrlComputedProps_js_1 = require("../addUrlComputedProps.js");
const utils_js_1 = require("./utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function resolveRouteFunction(routeFunction, pageContext, routeDefinedAt) {
    (0, addUrlComputedProps_js_1.assertPageContextUrlComputedProps)(pageContext);
    let result = routeFunction(pageContext);
    assertSyncRouting(result, `The Route Function ${routeDefinedAt}`);
    // TODO/v1-release
    //* We disallow asynchronous routing, because we need to check whether a link is a Vike link in a synchronous fashion before calling ev.preventDefault() in the 'click' event listener
    result = await result;
    //*/
    if (result === false) {
        return null;
    }
    if (result === true) {
        result = {};
    }
    (0, utils_js_1.assertUsage)((0, utils_js_1.isPlainObject)(result), `The Route Function ${routeDefinedAt} should return a boolean or a plain JavaScript object (but it's ${picocolors_1.default.cyan(`typeof result === ${JSON.stringify(typeof result)}`)} instead)`);
    if ('match' in result) {
        const { match } = result;
        (0, utils_js_1.assertUsage)(typeof match === 'boolean', `The ${picocolors_1.default.cyan('match')} value returned by the Route Function ${routeDefinedAt} should be a boolean.`);
        if (!match) {
            return null;
        }
    }
    let precedence = null;
    if ('precedence' in result) {
        precedence = result.precedence;
        (0, utils_js_1.assertUsage)(typeof precedence === 'number', `The ${picocolors_1.default.cyan('precedence')} value returned by the Route Function ${routeDefinedAt} should be a number.`);
    }
    assertRouteParams(result, `The ${picocolors_1.default.cyan('routeParams')} object returned by the Route Function ${routeDefinedAt} should`);
    const routeParams = result.routeParams || {};
    (0, utils_js_1.assertUsage)(!('pageContext' in result), `Providing ${picocolors_1.default.cyan('pageContext')} in Route Functions is prohibited, see https://vite-plugin-ssr.com/route-function#cannot-provide-pagecontext`);
    (0, utils_js_1.assert)((0, utils_js_1.isPlainObject)(routeParams));
    Object.keys(result).forEach((key) => {
        (0, utils_js_1.assertUsage)(key === 'match' || key === 'routeParams' || key === 'precedence', `The Route Function ${routeDefinedAt} returned an object with an unknown property ${picocolors_1.default.cyan(key)} (the known properties are ${picocolors_1.default.cyan('match')}, ${picocolors_1.default.cyan('routeParams')}, and ${picocolors_1.default.cyan('precedence')})`);
    });
    return {
        precedence,
        routeParams
    };
}
exports.resolveRouteFunction = resolveRouteFunction;
// TODO/v1-release: remove, and make routing synchronous (enabling Vike to synchronously check whether a link is a Vike link before even calling ev.preventDefault())
function assertSyncRouting(res, errPrefix) {
    (0, utils_js_1.assertWarning)(!(0, utils_js_1.isPromise)(res), `${errPrefix} returned a promise, but asynchronous routing is deprecated and will be removed in the next major release, see https://vite-plugin-ssr.com/route-function#async`, { onlyOnce: true });
}
exports.assertSyncRouting = assertSyncRouting;
// TODO/v1-release: remove
function warnDeprecatedAllowKey() {
    const allowKey = picocolors_1.default.cyan('iKnowThePerformanceRisksOfAsyncRouteFunctions');
    (0, utils_js_1.assertWarning)(false, `${allowKey} is deprecated and will be removed in the next major release`, { onlyOnce: true });
}
exports.warnDeprecatedAllowKey = warnDeprecatedAllowKey;
function assertRouteParams(result, errPrefix) {
    (0, utils_js_1.assert)(errPrefix.endsWith(' should'));
    if (!(0, utils_js_1.hasProp)(result, 'routeParams')) {
        return;
    }
    (0, utils_js_1.assert)(errPrefix.endsWith(' should'));
    (0, utils_js_1.assertUsage)((0, utils_js_1.isPlainObject)(result.routeParams), `${errPrefix} be a plain JavaScript object.`);
    (0, utils_js_1.assertUsage)((0, utils_js_1.isStringRecord)(result.routeParams), `${errPrefix} only hold string values.`);
}
exports.assertRouteParams = assertRouteParams;
