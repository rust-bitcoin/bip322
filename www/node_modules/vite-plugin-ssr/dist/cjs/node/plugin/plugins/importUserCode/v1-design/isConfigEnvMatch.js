"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConfigEnvMatch = void 0;
function isConfigEnvMatch(configEnv, isForClientSide, isClientRouting) {
    if (configEnv === '_routing-eager' || configEnv === 'config-only')
        return false;
    if (configEnv === (isForClientSide ? 'server-only' : 'client-only'))
        return false;
    if (configEnv === '_routing-lazy' && isForClientSide && !isClientRouting)
        return false;
    return true;
}
exports.isConfigEnvMatch = isConfigEnvMatch;
