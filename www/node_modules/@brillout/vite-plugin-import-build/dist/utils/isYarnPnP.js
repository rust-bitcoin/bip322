"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isYarnPnP = void 0;
function isYarnPnP() {
    try {
        require('pnpapi');
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.isYarnPnP = isYarnPnP;
