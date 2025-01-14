"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRouteString = exports.analyzeRouteString = exports.isStaticRouteString = exports.getUrlFromRouteString = exports.resolveRouteString = void 0;
const utils_js_1 = require("../utils.js");
const utils_js_2 = require("./utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const PARAM_TOKEN_NEW = '@';
// TODO/v1-release: remove
const PARAM_TOKEN_OLD = ':';
function assertRouteString(routeString, errPrefix = 'Invalid') {
    (0, utils_js_2.assert)(errPrefix.endsWith('Invalid') || errPrefix.endsWith('invalid'));
    (0, utils_js_2.assertUsage)(routeString !== '', `${errPrefix} Route String ${highlight(routeString)} (empty string): set it to ${highlight('/')} instead`);
    (0, utils_js_2.assertUsage)(routeString.startsWith('/') || routeString === '*', `${errPrefix} Route String ${highlight(routeString)}: Route Strings should start with a leading slash ${highlight('/')} (or be ${highlight('*')})`);
}
exports.assertRouteString = assertRouteString;
function resolveRouteString(routeString, urlPathname) {
    assertRouteString(routeString);
    (0, utils_js_2.assert)(urlPathname.startsWith('/'));
    const routeSegments = routeString.split('/');
    const urlSegments = urlPathname.split('/');
    const routeParams = {};
    assertGlob(routeString);
    if (routeString === '*') {
        routeString = '/*';
    }
    for (let i = 0; i < Math.max(routeSegments.length, urlSegments.length); i++) {
        const routeSegment = routeSegments[i];
        const urlSegment = urlSegments[i];
        if (routeSegment === '*') {
            routeParams['*'] = urlSegments.slice(Math.max(1, i)).join('/');
            return { routeParams };
        }
        else if (routeSegment && isParam(routeSegment)) {
            (0, utils_js_1.assertWarning)(!routeSegment.startsWith(PARAM_TOKEN_OLD), `Outdated Route String ${picocolors_1.default.cyan(routeString)}, use ${picocolors_1.default.cyan(routeString.split(PARAM_TOKEN_OLD).join(PARAM_TOKEN_NEW))} instead.`, { onlyOnce: true });
            if (!urlSegment) {
                return null;
            }
            routeParams[routeSegment.slice(1)] = urlSegment;
        }
        else {
            if ((routeSegment || '') !== (urlSegment || '')) {
                return null;
            }
        }
    }
    return { routeParams };
}
exports.resolveRouteString = resolveRouteString;
function getUrlFromRouteString(routeString) {
    (0, utils_js_2.assert)(routeString.startsWith('/'));
    if (isStaticRouteString(routeString)) {
        const url = routeString;
        return url;
    }
    return null;
}
exports.getUrlFromRouteString = getUrlFromRouteString;
function assertGlob(routeString) {
    const numberOfGlobChars = routeString.split('*').length - 1;
    (0, utils_js_2.assertUsage)(numberOfGlobChars <= 1, `Invalid Route String ${highlight(routeString)}: Route Strings aren't allowed to contain more than one glob ${highlight('*')} (use a Route Function instead)`);
    (0, utils_js_2.assertUsage)(numberOfGlobChars === 0 || (numberOfGlobChars === 1 && routeString.endsWith('*')), `Invalid Route String ${highlight(routeString)}: make sure it ends with ${highlight('*')} or use a Route Function`);
}
function analyzeRouteString(routeString) {
    const routeSegments = routeString.split('/').filter((routeSegment) => routeSegment !== '' && routeSegment !== '*');
    let numberOfStaticSegmentsBeginning = 0;
    for (const routeSegment of routeSegments) {
        if (isParam(routeSegment)) {
            break;
        }
        numberOfStaticSegmentsBeginning++;
    }
    const numberOfStaticSegements = routeSegments.filter((s) => !isParam(s)).length;
    const numberOfParameterSegments = routeSegments.filter((s) => isParam(s)).length;
    const isCatchAll = routeString.endsWith('*');
    return { numberOfParameterSegments, numberOfStaticSegmentsBeginning, numberOfStaticSegements, isCatchAll };
}
exports.analyzeRouteString = analyzeRouteString;
function isParam(routeSegment) {
    return routeSegment.startsWith(PARAM_TOKEN_NEW) || routeSegment.startsWith(PARAM_TOKEN_OLD);
}
function isStaticRouteString(routeString) {
    const url = routeString;
    const match = resolveRouteString(routeString, url);
    (0, utils_js_2.assert)(match);
    return Object.keys(match.routeParams).length === 0;
}
exports.isStaticRouteString = isStaticRouteString;
function highlight(routeString) {
    if ((0, utils_js_1.isBrowser)()) {
        return `'${routeString}'`;
    }
    else {
        if (routeString === '') {
            routeString = "''";
        }
        return picocolors_1.default.cyan(routeString);
    }
}
