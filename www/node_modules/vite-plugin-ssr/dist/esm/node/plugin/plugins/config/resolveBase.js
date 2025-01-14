export { resolveBase };
export { resolveBaseFromUserConfig };
import { assert, assertUsage, isBaseServer, isBaseAssets } from '../../utils.js';
import { pickFirst } from './pickFirst.js';
import pc from '@brillout/picocolors';
function resolveBase(configs, config) {
    const baseServer = pickFirst(configs.map((c) => c.baseServer)) ?? null;
    const baseAssets = pickFirst(configs.map((c) => c.baseAssets)) ?? null;
    let baseOriginal = config._baseOriginal;
    if (baseOriginal === '/__UNSET__')
        baseOriginal = null;
    assert(baseOriginal === null || typeof baseOriginal == 'string');
    return resolve(baseOriginal, baseServer, baseAssets);
}
function resolveBaseFromUserConfig(config, configVps) {
    return resolve(config.base ?? null, configVps?.baseServer ?? null, configVps?.baseAssets ?? null);
}
function resolve(base, baseServer_, baseAssets_) {
    {
        const wrongBase = (val) => `should start with ${pc.cyan('/')}, ${pc.cyan('http://')}, or ${pc.cyan('https://')} (it's ${pc.cyan(val)} instead)`;
        assertUsage(base === null || isBaseAssets(base), `vite.config.js#base ${wrongBase(base)}`);
        assertUsage(baseAssets_ === null || isBaseAssets(baseAssets_), `Config ${pc.cyan('baseAssets')} ${wrongBase(baseAssets_)}`);
        assertUsage(baseServer_ === null || baseServer_.startsWith('/'), `Config ${pc.cyan('baseServer')} should start with a leading slash ${pc.cyan('/')} (it's ${pc.cyan(String(baseServer_))} instead)`);
    }
    if (base) {
        if (base.startsWith('http')) {
            baseAssets_ = baseAssets_ ?? base;
        }
        else {
            baseAssets_ = baseAssets_ ?? base;
            baseServer_ = baseServer_ ?? base;
        }
    }
    const baseServer = baseServer_ ?? '/';
    const baseAssets = baseAssets_ ?? '/';
    assert(isBaseAssets(baseAssets));
    assert(isBaseServer(baseServer));
    return {
        baseServer,
        baseAssets
    };
}
