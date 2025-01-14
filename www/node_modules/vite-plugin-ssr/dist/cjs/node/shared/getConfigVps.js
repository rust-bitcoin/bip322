"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigVps = void 0;
async function getConfigVps(config) {
    const configVps = (await config.configVpsPromise);
    return configVps;
}
exports.getConfigVps = getConfigVps;
