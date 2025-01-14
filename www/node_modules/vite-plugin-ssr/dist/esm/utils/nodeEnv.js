export { getNodeEnv };
export { setNodeEnvToProduction };
function getNodeEnv() {
    if (typeof process === 'undefined')
        return null;
    return process.env.NODE_ENV;
}
function setNodeEnvToProduction() {
    // The statement `process.env['NODE_ENV'] = 'production'` chokes webpack v4
    const proc = process;
    const { env } = proc;
    env.NODE_ENV = 'production';
}
