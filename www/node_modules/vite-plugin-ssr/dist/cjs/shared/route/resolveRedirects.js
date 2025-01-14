"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRouteStringRedirect = exports.resolveRedirects = void 0;
const assertIsNotBrowser_js_1 = require("../../utils/assertIsNotBrowser.js");
const utils_js_1 = require("../utils.js");
const resolveRouteString_js_1 = require("./resolveRouteString.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
(0, assertIsNotBrowser_js_1.assertIsNotBrowser)(); // Don't bloat the client
// TODO/v1-release: update
const configSrc = '[vite.config.js > ssr({ redirects })]';
function resolveRedirects(redirects, urlPathname) {
    for (const [urlSource, urlTarget] of Object.entries(redirects)) {
        const urlResolved = resolveRouteStringRedirect(urlSource, urlTarget, urlPathname);
        if (urlResolved)
            return urlResolved;
    }
    return null;
}
exports.resolveRedirects = resolveRedirects;
function resolveRouteStringRedirect(urlSource, urlTarget, urlPathname) {
    (0, resolveRouteString_js_1.assertRouteString)(urlSource, `${configSrc} Invalid`);
    (0, utils_js_1.assertUsage)(urlTarget.startsWith('/') ||
        urlTarget.startsWith('http://') ||
        urlTarget.startsWith('https://') ||
        urlTarget === '*', `${configSrc} Invalid redirection target URL ${picocolors_1.default.cyan(urlTarget)}: the target URL should start with ${picocolors_1.default.cyan('/')}, ${picocolors_1.default.cyan('http://')}, ${picocolors_1.default.cyan('https://')}, or be ${picocolors_1.default.cyan('*')}`);
    assertParams(urlSource, urlTarget);
    const match = (0, resolveRouteString_js_1.resolveRouteString)(urlSource, urlPathname);
    if (!match)
        return null;
    let urlResolved = urlTarget;
    Object.entries(match.routeParams).forEach(([key, val]) => {
        if (key !== '*') {
            key = `@${key}`;
        }
        urlResolved = urlResolved.replaceAll(key, val);
    });
    (0, utils_js_1.assert)(!urlResolved.includes('@'));
    if (urlResolved === urlPathname)
        return null;
    (0, utils_js_1.assert)(urlTarget.startsWith('/') || urlTarget.startsWith('http'));
    return urlResolved;
}
exports.resolveRouteStringRedirect = resolveRouteStringRedirect;
function assertParams(urlSource, urlTarget) {
    const routeSegments = urlTarget.split('/');
    routeSegments.forEach((routeSegment) => {
        if (routeSegment.startsWith('@') || routeSegment.startsWith('*')) {
            const segments = urlSource.split('/');
            (0, utils_js_1.assertUsage)(segments.includes(routeSegment), `${configSrc} The redirection source URL ${picocolors_1.default.cyan(urlSource)} is missing the URL parameter ${picocolors_1.default.cyan(routeSegment)} used by the redirection target URL ${picocolors_1.default.cyan(urlTarget)}`);
        }
    });
}
