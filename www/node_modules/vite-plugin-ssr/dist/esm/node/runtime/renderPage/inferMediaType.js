export { inferMediaType };
import { styleFileRE, isScriptFile } from '../utils.js';
function inferMediaType(href) {
    // Basics
    if (styleFileRE.test(href)) {
        return { mediaType: 'text/css', assetType: 'style' };
    }
    if (isScriptFile(href)) {
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
