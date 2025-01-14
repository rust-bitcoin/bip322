"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagesAndRoutesInfo = exports.log404 = void 0;
const globalContext_js_1 = require("../../globalContext.js");
const utils_js_1 = require("../../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function log404(pageContext) {
    const { urlPathname } = pageContext;
    const pageRoutes = pageContext._pageRoutes;
    (0, utils_js_1.assertUsage)(pageRoutes.length > 0, 'No page found.'
    /* TODO/v1-release: use this
    'No page found. Create at least one /pages/some-page/+Page.js file.'
    */
    );
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    if (!globalContext.isProduction && !isFileRequest(urlPathname) && !pageContext.isClientSideNavigation) {
        (0, utils_js_1.assertInfo)(false, [
            `URL ${picocolors_1.default.cyan(urlPathname)} doesn't match the route of any of your pages:`,
            getPagesAndRoutesInfo(pageRoutes),
            'See https://vite-plugin-ssr.com/routing for more information about routing.'
        ].join('\n'), { onlyOnce: false });
    }
}
exports.log404 = log404;
function getPagesAndRoutesInfo(pageRoutes) {
    const entries = pageRoutes
        .map((pageRoute) => {
        let routeStr;
        let routeTypeSrc;
        let routeDefinedBy;
        if (pageRoute.routeType === 'FILESYSTEM') {
            (0, utils_js_1.assert)(pageRoute.routeFilesystemDefinedBy);
            routeDefinedBy = pageRoute.routeFilesystemDefinedBy;
        }
        else {
            (0, utils_js_1.assert)(pageRoute.routeDefinedAt);
            routeDefinedBy = pageRoute.routeDefinedAt;
        }
        if (pageRoute.routeType === 'STRING') {
            routeStr = pageRoute.routeString;
            routeTypeSrc = 'Route String';
        }
        else if (pageRoute.routeType === 'FUNCTION') {
            routeStr = String(pageRoute.routeFunction);
            routeTypeSrc = 'Route Function';
        }
        else {
            routeStr = pageRoute.routeString;
            routeTypeSrc = 'Filesystem Route';
        }
        (0, utils_js_1.assert)(routeStr && routeTypeSrc && routeDefinedBy);
        return { routeStr, routeTypeSrc, routeDefinedBy };
    })
        .sort((e1, e2) => {
        if (e1.routeTypeSrc !== 'Route Function' && e2.routeTypeSrc === 'Route Function') {
            return -1;
        }
        if (e1.routeTypeSrc === 'Route Function' && e2.routeTypeSrc !== 'Route Function') {
            return 1;
        }
        return (0, utils_js_1.compareString)(e1.routeStr, e2.routeStr);
    });
    const linesContent = [
        {
            routeStr: 'ROUTE',
            routeTypeSrc: 'TYPE',
            routeDefinedBy: 'DEFINED BY'
        },
        ...entries
    ];
    const terminalWidth = (0, utils_js_1.getTerminalWidth)() || 134;
    let width2 = Math.max(...linesContent.map(({ routeTypeSrc }) => routeTypeSrc.length));
    let width3 = Math.max(...linesContent.map(({ routeDefinedBy }) => routeDefinedBy.length));
    let width1 = terminalWidth - width3 - width2 - 10;
    linesContent.forEach((lineContent) => {
        let { routeStr } = lineContent;
        if (lineContent.routeTypeSrc !== 'Route Function') {
            routeStr = (0, utils_js_1.truncateString)(routeStr, width1, (s) => picocolors_1.default.dim(s));
        }
        else {
            routeStr = truncateRouteFunction(routeStr, width1);
        }
        (0, utils_js_1.assert)((0, utils_js_1.stripAnsi)(routeStr).length <= width1);
        lineContent.routeStr = routeStr;
    });
    width1 = Math.max(...linesContent.map(({ routeStr }) => (0, utils_js_1.stripAnsi)(routeStr).length));
    let lines = linesContent.map(({ routeStr, routeTypeSrc, routeDefinedBy }, i) => {
        let cell1 = routeStr.padEnd(width1 + (routeStr.length - (0, utils_js_1.stripAnsi)(routeStr).length), ' ');
        let cell2 = routeTypeSrc.padEnd(width2, ' ');
        let cell3 = routeDefinedBy.padEnd(width3, ' ');
        const isHeader = i === 0;
        if (isHeader) {
            cell1 = picocolors_1.default.dim(cell1);
            cell2 = picocolors_1.default.dim(cell2);
            cell3 = picocolors_1.default.dim(cell3);
        }
        let line = [cell1, cell2, cell3].join(picocolors_1.default.dim(' │ '));
        line = picocolors_1.default.dim('│ ') + line + picocolors_1.default.dim(' │');
        return line;
    });
    width1 = width1 + 2;
    width2 = width2 + 2;
    width3 = width3 + 2;
    // https://en.wikipedia.org/wiki/Box-drawing_character
    lines = [
        picocolors_1.default.dim(`┌${'─'.repeat(width1)}┬${'─'.repeat(width2)}┬${'─'.repeat(width3)}┐`),
        lines[0],
        picocolors_1.default.dim(`├${'─'.repeat(width1)}┼${'─'.repeat(width2)}┼${'─'.repeat(width3)}┤`),
        ...lines.slice(1),
        picocolors_1.default.dim(`└${'─'.repeat(width1)}┴${'─'.repeat(width2)}┴${'─'.repeat(width3)}┘`)
    ];
    lines.forEach((line) => {
        (0, utils_js_1.assert)((0, utils_js_1.stripAnsi)(line).length <= terminalWidth);
    });
    return lines.join('\n');
}
exports.getPagesAndRoutesInfo = getPagesAndRoutesInfo;
function truncateRouteFunction(routeStr, lenMax) {
    routeStr = (0, utils_js_1.stripAnsi)(routeStr);
    routeStr = removeNonAscii(routeStr);
    routeStr = routeStr.split(/\s/).filter(Boolean).join(' ');
    routeStr = (0, utils_js_1.truncateString)(routeStr, lenMax, (s) => picocolors_1.default.dim(s));
    return routeStr;
}
function removeNonAscii(str) {
    // https://stackoverflow.com/questions/20856197/remove-non-ascii-character-in-string/20856346#20856346
    return str.replace(/[^\x00-\x7F]/g, '');
}
function isFileRequest(urlPathname) {
    (0, utils_js_1.assert)(urlPathname.startsWith('/'));
    const paths = urlPathname.split('/');
    const lastPath = paths[paths.length - 1];
    (0, utils_js_1.assert)(typeof lastPath === 'string');
    const parts = lastPath.split('.');
    if (parts.length < 2) {
        return false;
    }
    const fileExtension = parts[parts.length - 1];
    (0, utils_js_1.assert)(typeof fileExtension === 'string');
    return /^[a-z0-9]+$/.test(fileExtension);
}
