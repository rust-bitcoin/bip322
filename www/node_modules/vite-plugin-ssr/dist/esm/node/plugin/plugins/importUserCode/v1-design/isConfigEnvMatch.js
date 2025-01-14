export { isConfigEnvMatch };
function isConfigEnvMatch(configEnv, isForClientSide, isClientRouting) {
    if (configEnv === '_routing-eager' || configEnv === 'config-only')
        return false;
    if (configEnv === (isForClientSide ? 'server-only' : 'client-only'))
        return false;
    if (configEnv === '_routing-lazy' && isForClientSide && !isClientRouting)
        return false;
    return true;
}
