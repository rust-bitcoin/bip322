"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferMediaType = void 0;
const utils_js_1 = require("../utils.js");
function inferMediaType(href) {
    // Basics
    if (utils_js_1.styleFileRE.test(href)) {
        return { mediaType: 'text/css', assetType: 'style' };
    }
    if ((0, utils_js_1.isScriptFile)(href)) {
        return { mediaType: 'text/javascript', assetType: 'script' };
    }
    // Images
    if (href.endsWith('.png')) {
        return { assetType: 'image', mediaType: 'image/png' };
    }
    if (href.endsWith('.webp')) {
        return { assetType: 'image', mediaType: 'image/webp' };
    }
    if (href.endsWith('.jpg') || href.endsWith('.jpeg')) {
        return { assetType: 'image', mediaType: 'image/jpeg' };
    }
    if (href.endsWith('.gif')) {
        return { assetType: 'image', mediaType: 'image/gif' };
    }
    if (href.endsWith('.svg')) {
        return { assetType: 'image', mediaType: 'image/svg+xml' };
    }
    // Fonts
    if (href.endsWith('.ttf')) {
        return { assetType: 'font', mediaType: 'font/ttf' };
    }
    if (href.endsWith('.woff')) {
        return { assetType: 'font', mediaType: 'font/woff' };
    }
    if (href.endsWith('.woff2')) {
        return { assetType: 'font', mediaType: 'font/woff2' };
    }
    return null;
}
exports.inferMediaType = inferMediaType;
