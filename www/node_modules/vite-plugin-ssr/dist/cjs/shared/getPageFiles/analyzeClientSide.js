"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeClientSide = void 0;
const utils_js_1 = require("../page-configs/utils.js");
const analyzePageClientSide_js_1 = require("./analyzePageClientSide.js");
function analyzeClientSide(pageConfig, pageFilesAll, pageId) {
    // V1 design
    if (pageConfig) {
        const isClientRouting = (0, utils_js_1.getConfigValue)(pageConfig, 'clientRouting', 'boolean')?.value ?? false;
        const isClientSideRenderable = (0, utils_js_1.getConfigValue)(pageConfig, 'isClientSideRenderable', 'boolean')?.value ?? false;
        return { isClientSideRenderable, isClientRouting };
    }
    else {
        // TODO/v1-release:
        //  - remove V0.4 implementation
        //  - globally rename isHtmlOnly to !isClientSideRenderable
        // V0.4 design
        const { isHtmlOnly, isClientRouting } = (0, analyzePageClientSide_js_1.analyzePageClientSide)(pageFilesAll, pageId);
        return { isClientSideRenderable: !isHtmlOnly, isClientRouting };
    }
}
exports.analyzeClientSide = analyzeClientSide;
