"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugPageFiles = void 0;
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const utils_js_1 = require("../utils.js");
function debugPageFiles({ pageContext, isHtmlOnly, isClientRouting, pageFilesLoaded, pageFilesServerSide, pageFilesClientSide, clientEntries, clientDependencies }) {
    const debug = (0, utils_js_1.createDebugger)('vps:pageFiles', { serialization: { emptyArray: 'None' } });
    const padding = '   - ';
    debug('All page files:', printPageFiles(pageContext._pageFilesAll, true)); // TODO
    debug(`URL:`, pageContext.urlOriginal);
    debug.options({ serialization: { emptyArray: 'No match' } })(`Routing:`, printRouteMatches(pageContext._routeMatches));
    debug(`pageId:`, pageContext._pageId);
    debug('Page type:', isHtmlOnly ? 'HTML-only' : 'SSR/SPA');
    debug(`Routing type:`, !isHtmlOnly && isClientRouting ? 'Client Routing' : 'Server Routing');
    debug('Server-side page files:', printPageFiles(pageFilesLoaded));
    (0, utils_js_1.assert)(samePageFiles(pageFilesLoaded, pageFilesServerSide));
    debug('Client-side page files:', printPageFiles(pageFilesClientSide));
    debug('Client-side entries:', clientEntries);
    debug('Client-side dependencies:', clientDependencies);
    return;
    function printRouteMatches(routeMatches) {
        if (routeMatches === 'ROUTE_ERROR') {
            return 'Routing Failed';
        }
        if (routeMatches === 'CUSTOM_ROUTE') {
            return 'Custom Routing';
        }
        return routeMatches;
    }
    function printPageFiles(pageFiles, genericPageFilesLast = false) {
        if (pageFiles.length === 0) {
            return 'None';
        }
        return ('\n' +
            pageFiles
                .sort((p1, p2) => p1.filePath.localeCompare(p2.filePath))
                .sort((0, utils_js_1.makeFirst)((p) => (p.isRendererPageFile ? !genericPageFilesLast : null)))
                .sort((0, utils_js_1.makeFirst)((p) => (p.isDefaultPageFile ? !genericPageFilesLast : null)))
                .map((p) => p.filePath)
                .map((s) => s.split('_default.page.').join(`${picocolors_1.default.blue('_default')}.page.`))
                .map((s) => s.split('/renderer/').join(`/${picocolors_1.default.red('renderer')}/`))
                .map((s) => padding + s)
                .join('\n'));
    }
}
exports.debugPageFiles = debugPageFiles;
function samePageFiles(pageFiles1, pageFiles2) {
    return (pageFiles1.every((p1) => pageFiles2.some((p2) => p2.filePath === p1.filePath)) &&
        pageFiles2.every((p2) => pageFiles1.some((p1) => p1.filePath === p2.filePath)));
}
