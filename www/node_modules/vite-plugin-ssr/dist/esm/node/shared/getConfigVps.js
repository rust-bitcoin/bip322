export { getConfigVps };
async function getConfigVps(config) {
    const configVps = (await config.configVpsPromise);
    return configVps;
}
