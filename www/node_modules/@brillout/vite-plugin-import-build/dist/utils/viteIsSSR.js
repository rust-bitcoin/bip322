"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viteIsSSR = void 0;
function viteIsSSR(config) {
    var _a;
    return !!((_a = config === null || config === void 0 ? void 0 : config.build) === null || _a === void 0 ? void 0 : _a.ssr);
}
exports.viteIsSSR = viteIsSSR;
