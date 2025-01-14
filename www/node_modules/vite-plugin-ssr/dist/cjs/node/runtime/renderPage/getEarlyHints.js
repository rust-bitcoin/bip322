"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEarlyHints = void 0;
const inferHtmlTags_js_1 = require("../html/injectAssets/inferHtmlTags.js");
const utils_js_1 = require("../utils.js");
function getEarlyHints(assets) {
    const earlyHints = [];
    {
        assets.forEach((asset) => {
            // Don't early hint fallback fonts, https://github.com/brillout/vite-plugin-ssr/issues/624
            if (isFontFallback(asset, earlyHints))
                return;
            earlyHints.push({
                ...asset,
                earlyHintLink: (0, inferHtmlTags_js_1.inferEarlyHintLink)(asset)
            });
        });
    }
    return earlyHints;
}
exports.getEarlyHints = getEarlyHints;
function isFontFallback(asset, earlyHints) {
    if (asset.assetType !== 'font') {
        return false;
    }
    const fontUrlBase = removeFileExtentionAndHash(asset.src);
    return earlyHints.some((hint) => {
        return hint.assetType === 'font' && removeFileExtentionAndHash(hint.src) === fontUrlBase;
    });
}
function removeFileExtentionAndHash(assetUrl) {
    (0, utils_js_1.assert)(!assetUrl.includes('\\'));
    // The logic below doesn't work for '/assets/chunk-0e184ced.js'
    (0, utils_js_1.assert)(!assetUrl.endsWith('.js'));
    const paths = assetUrl.split('/');
    {
        const filename = paths[paths.length - 1];
        const filenameParts = filename.split('.');
        (0, utils_js_1.assert)(filenameParts.length >= 2);
        // User may set config.build.rollupOptions.output.assetFileNames => we can't assume the filename to be `*.${hash}.${ext}`
        const filenameBase = filenameParts.slice(0, filenameParts.length === 2 ? -1 : -2);
        (0, utils_js_1.assert)(filenameBase.length >= 1);
        paths[paths.length - 1] = filenameBase.join('.');
    }
    return paths.join('/');
}
