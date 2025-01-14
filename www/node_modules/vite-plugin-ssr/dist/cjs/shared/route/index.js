"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.route = void 0;
// Ensure we don't bloat runtime of Server Routing
const assertRoutingType_js_1 = require("../../utils/assertRoutingType.js");
const isBrowser_js_1 = require("../../utils/isBrowser.js");
if ((0, isBrowser_js_1.isBrowser)()) {
    (0, assertRoutingType_js_1.assertClientRouting)();
}
const utils_js_1 = require("./utils.js");
const addUrlComputedProps_js_1 = require("../addUrlComputedProps.js");
const resolvePrecedence_js_1 = require("./resolvePrecedence.js");
const resolveRouteString_js_1 = require("./resolveRouteString.js");
const resolveRouteFunction_js_1 = require("./resolveRouteFunction.js");
const executeOnBeforeRouteHook_js_1 = require("./executeOnBeforeRouteHook.js");
const debug_js_1 = require("./debug.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function route(pageContext) {
    (0, addUrlComputedProps_js_1.addUrlComputedProps)(pageContext);
    (0, debug_js_1.debug)('Pages routes:', pageContext._pageRoutes);
    const pageContextAddendum = {};
    if (pageContext._onBeforeRouteHook) {
        const pageContextAddendumHook = await (0, executeOnBeforeRouteHook_js_1.executeOnBeforeRouteHook)(pageContext._onBeforeRouteHook, pageContext);
        if (pageContextAddendumHook) {
            (0, utils_js_1.objectAssign)(pageContextAddendum, pageContextAddendumHook);
            if ((0, utils_js_1.hasProp)(pageContextAddendum, '_pageId', 'string') || (0, utils_js_1.hasProp)(pageContextAddendum, '_pageId', 'null')) {
                // We bypass `vite-plugin-ssr`'s routing
                if (!(0, utils_js_1.hasProp)(pageContextAddendum, 'routeParams')) {
                    (0, utils_js_1.objectAssign)(pageContextAddendum, { routeParams: {} });
                }
                else {
                    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContextAddendum, 'routeParams', 'object'));
                }
                (0, utils_js_1.objectAssign)(pageContextAddendum, {
                    _routingProvidedByOnBeforeRouteHook: true,
                    _routeMatches: 'CUSTOM_ROUTE'
                });
                return { pageContextAddendum };
            }
            // We already assign so that `pageContext.urlOriginal === pageContextAddendum.urlOriginal`; enabling the `onBeforeRoute()` hook to mutate `pageContext.urlOriginal` before routing.
            (0, utils_js_1.objectAssign)(pageContext, pageContextAddendum);
        }
    }
    (0, utils_js_1.objectAssign)(pageContextAddendum, {
        _routingProvidedByOnBeforeRouteHook: false
    });
    // `vite-plugin-ssr`'s routing
    const allPageIds = pageContext._allPageIds;
    (0, utils_js_1.assert)(allPageIds.length >= 0);
    (0, utils_js_1.assertUsage)(pageContext._pageFilesAll.length > 0 || pageContext._pageConfigs.length > 0, 'No *.page.js file found. You must create at least one *.page.js file.');
    (0, utils_js_1.assertUsage)(allPageIds.length > 0, "You must create at least one *.page.js file that isn't _default.page.*");
    const { urlPathname } = pageContext;
    (0, utils_js_1.assert)(urlPathname.startsWith('/'));
    const routeMatches = [];
    await Promise.all(pageContext._pageRoutes.map(async (pageRoute) => {
        const { pageId, routeType } = pageRoute;
        // Filesytem Routing
        if (pageRoute.routeType === 'FILESYSTEM') {
            const { routeString } = pageRoute;
            const match = (0, resolveRouteString_js_1.resolveRouteString)(routeString, urlPathname);
            if (match) {
                const { routeParams } = match;
                routeMatches.push({ pageId, routeParams, routeString, routeType });
            }
            return;
        }
        // Route String defined in `.page.route.js`
        if (pageRoute.routeType === 'STRING') {
            const { routeString } = pageRoute;
            const match = (0, resolveRouteString_js_1.resolveRouteString)(routeString, urlPathname);
            if (match) {
                const { routeParams } = match;
                (0, utils_js_1.assert)(routeType === 'STRING');
                routeMatches.push({
                    pageId,
                    routeString,
                    routeParams,
                    routeType
                });
            }
            return;
        }
        // Route Function defined in `.page.route.js`
        if (pageRoute.routeType === 'FUNCTION') {
            const { routeFunction, routeDefinedAt } = pageRoute;
            const match = await (0, resolveRouteFunction_js_1.resolveRouteFunction)(routeFunction, pageContext, routeDefinedAt);
            if (match) {
                const { routeParams, precedence } = match;
                routeMatches.push({ pageId, precedence, routeParams, routeType });
            }
            return;
        }
        (0, utils_js_1.assert)(false);
    }));
    (0, resolvePrecedence_js_1.resolvePrecendence)(routeMatches);
    const winner = routeMatches[0];
    (0, debug_js_1.debug)(`Route matches for URL ${picocolors_1.default.cyan(urlPathname)} (in precedence order):`, routeMatches);
    (0, utils_js_1.objectAssign)(pageContextAddendum, { _routeMatches: routeMatches });
    if (!winner) {
        (0, utils_js_1.objectAssign)(pageContextAddendum, {
            _pageId: null,
            routeParams: {}
        });
        return { pageContextAddendum };
    }
    {
        const { routeParams } = winner;
        (0, utils_js_1.assert)((0, utils_js_1.isPlainObject)(routeParams));
        (0, utils_js_1.objectAssign)(pageContextAddendum, {
            _pageId: winner.pageId,
            routeParams: winner.routeParams
        });
    }
    return { pageContextAddendum };
}
exports.route = route;
