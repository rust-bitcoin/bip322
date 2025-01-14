"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePrecendence = void 0;
// export type { RouteMatch }
const resolveRouteString_js_1 = require("./resolveRouteString.js");
const utils_js_1 = require("./utils.js");
const utils_js_2 = require("./utils.js");
const resolveRouteString_js_2 = require("./resolveRouteString.js");
// See https://vite-plugin-ssr.com/route-function#precedence
function resolvePrecendence(routeMatches) {
    // prettier-ignore
    routeMatches
        .sort(sortMatches)
        .sort((0, utils_js_2.makeFirst)((routeMatch) => routeMatch.routeType === 'FUNCTION' && !!routeMatch.precedence && routeMatch.precedence < 0))
        .sort((0, utils_js_2.makeFirst)((routeMatch) => routeMatch.routeType === 'STRING' && (0, resolveRouteString_js_2.isStaticRouteString)(routeMatch.routeString) === false))
        .sort((0, utils_js_2.makeFirst)((routeMatch) => routeMatch.routeType === 'FUNCTION' && !routeMatch.precedence))
        .sort((0, utils_js_2.makeFirst)((routeMatch) => routeMatch.routeType === 'STRING' && (0, resolveRouteString_js_2.isStaticRouteString)(routeMatch.routeString) === true))
        .sort((0, utils_js_2.makeFirst)((routeMatch) => routeMatch.routeType === 'FILESYSTEM'))
        .sort((0, utils_js_2.makeFirst)((routeMatch) => routeMatch.routeType === 'FUNCTION' && !!routeMatch.precedence && routeMatch.precedence > 0));
}
exports.resolvePrecendence = resolvePrecendence;
// -1 => routeMatch1 higher precedence
// +1 => routeMatch2 higher precedence
function sortMatches(routeMatch1, routeMatch2) {
    {
        const precedence1 = routeMatch1.precedence ?? 0;
        const precedence2 = routeMatch2.precedence ?? 0;
        if (precedence1 !== precedence2) {
            return precedence1 > precedence2 ? -1 : 1;
        }
    }
    if (!routeMatch2.routeString) {
        return 0;
    }
    if (!routeMatch1.routeString) {
        return 0;
    }
    // Return route with highest number of static path segments at beginning first
    {
        const getValue = (routeString) => (0, resolveRouteString_js_1.analyzeRouteString)(routeString).numberOfStaticSegmentsBeginning;
        const result = (0, utils_js_1.higherFirst)(getValue)(routeMatch1.routeString, routeMatch2.routeString);
        if (result !== 0) {
            return result;
        }
    }
    // Return route with highest number of static path segments in total first
    {
        const getValue = (routeString) => (0, resolveRouteString_js_1.analyzeRouteString)(routeString).numberOfStaticSegements;
        const result = (0, utils_js_1.higherFirst)(getValue)(routeMatch1.routeString, routeMatch2.routeString);
        if (result !== 0) {
            return result;
        }
    }
    // Return route with most parameter segements first
    {
        const getValue = (routeString) => (0, resolveRouteString_js_1.analyzeRouteString)(routeString).numberOfParameterSegments;
        const result = (0, utils_js_1.higherFirst)(getValue)(routeMatch1.routeString, routeMatch2.routeString);
        if (result !== 0) {
            return result;
        }
    }
    // Return catch-all routes last
    {
        if ((0, resolveRouteString_js_1.analyzeRouteString)(routeMatch2.routeString).isCatchAll) {
            return -1;
        }
        if ((0, resolveRouteString_js_1.analyzeRouteString)(routeMatch1.routeString).isCatchAll) {
            return 1;
        }
    }
    return 0;
}
