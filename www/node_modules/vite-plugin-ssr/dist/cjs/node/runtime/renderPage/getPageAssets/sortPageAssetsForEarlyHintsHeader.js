"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortPageAssetsForEarlyHintsHeader = void 0;
const globalContext_js_1 = require("../../globalContext.js");
const utils_js_1 = require("../../utils.js");
function sortPageAssetsForEarlyHintsHeader(pageAssets) {
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    pageAssets.sort((0, utils_js_1.higherFirst)(({ assetType }) => {
        // In dev, we load scripts first in order to parallelize I/O and CPU
        if (!globalContext.isProduction && assetType === 'script') {
            return 1;
        }
        let priority = 0;
        // CSS has highest priority
        if (assetType === 'style')
            return priority;
        priority--;
        // Visual assets have high priority
        if (assetType === 'font')
            return priority;
        priority--;
        if (assetType === 'image')
            return priority;
        priority--;
        // Others
        if (assetType !== 'script')
            return priority;
        priority--;
        // JavaScript has lowest priority
        return priority;
    }));
}
exports.sortPageAssetsForEarlyHintsHeader = sortPageAssetsForEarlyHintsHeader;
