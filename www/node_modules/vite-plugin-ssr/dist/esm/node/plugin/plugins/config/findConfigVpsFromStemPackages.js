export { findConfigVpsFromStemPackages };
import { assert, createDebugger, isObject } from '../../utils.js';
import { getStemPackages } from './stemUtils.js';
const debug = createDebugger('vps:stem');
async function findConfigVpsFromStemPackages(root) {
    if (isDeno())
        return [];
    const stemPackages = await getStemPackages(root);
    const configVpsFromStemPackages = [];
    debug('Stem packages found:', stemPackages.map(({ stemPackageName, stemPackageRootDir }) => ({ stemPackageName, stemPackageRootDir })));
    await Promise.all(stemPackages.map(async ({ loadModule }) => {
        const moduleExports = await loadModule('vite-plugin-ssr.config.js');
        if (!moduleExports)
            return;
        const configVps = moduleExports.default;
        assert(isObject(configVps));
        configVpsFromStemPackages.push(configVps);
    }));
    return configVpsFromStemPackages;
}
function isDeno() {
    // @ts-ignore
    return typeof Deno !== 'undefined' && Deno.env;
}
