"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeExports = void 0;
const getExportNames_js_1 = require("./getExportNames.js");
const utils_js_1 = require("../../utils.js");
// TODO/v1-release: remove
function analyzeExports({ pageFilesClientSide, pageFilesServerSide, pageId }) {
    return { isHtmlOnly: isHtmlOnly(), isClientRouting: isClientRouting() };
    function isHtmlOnly() {
        {
            const hasPageIdIsmrphFile = pageFilesServerSide.some((p) => p.pageId === pageId && p.fileType === '.page');
            if (hasPageIdIsmrphFile) {
                assertClientSideRenderHook();
                return false;
            }
        }
        {
            const hasPageIdServerFile = pageFilesServerSide.some((p) => p.pageId === pageId && p.fileType === '.page.server');
            if (!hasPageIdServerFile) {
                return false;
            }
        }
        {
            const definesClientRenderer = pageFilesClientSide.some((p) => p.pageId === pageId && p.fileType === '.page.client' && (0, getExportNames_js_1.getExportNames)(p).includes('render'));
            if (definesClientRenderer) {
                return false;
            }
        }
        return true;
    }
    function assertClientSideRenderHook() {
        const hasClientSideRenderHook = pageFilesClientSide.some((p) => {
            return (0, getExportNames_js_1.getExportNames)(p).includes('render');
        });
        (0, utils_js_1.assertUsage)(hasClientSideRenderHook, [
            'No client-side `render()` hook found.',
            'See https://vite-plugin-ssr.com/render-modes for more information.',
            [
                'Loaded client-side page files (none of them `export { render }`):',
                ...pageFilesClientSide.map((p, i) => ` (${i + 1}): ${p.filePath}`)
            ].join('\n')
        ].join(' '));
    }
    function isClientRouting() {
        const hasClientRoutingExport = pageFilesClientSide.some((p) => {
            return (0, getExportNames_js_1.getExportNames)(p).includes('clientRouting');
        });
        return hasClientRoutingExport;
    }
}
exports.analyzeExports = analyzeExports;
