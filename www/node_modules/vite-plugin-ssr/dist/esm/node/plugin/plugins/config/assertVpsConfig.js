export { assertVpsConfig };
import { assert, assertUsage, hasProp, isObject } from '../../utils.js';
function assertVpsConfig(vikeConfig, wrongUsageMsg) {
    const wrongUsageError = checkConfigVps(vikeConfig);
    if (wrongUsageError) {
        assertUsage(false, wrongUsageMsg(wrongUsageError));
    }
}
function checkConfigVps(configVps) {
    assert(isObject(configVps));
    {
        const prop = 'disableUrlNormalization';
        if (!hasProp(configVps, prop, 'boolean') && !hasProp(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be a boolean' };
    }
    {
        const prop = 'trailingSlash';
        if (!hasProp(configVps, prop, 'boolean') && !hasProp(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be a boolean' };
    }
    {
        const prop = 'redirects';
        const { redirects } = configVps;
        if (!(redirects === undefined ||
            (isObject(redirects) && Object.values(redirects).every((v) => typeof v === 'string'))))
            return { prop, errMsg: 'should be an object of strings' };
    }
    {
        const prop = 'disableAutoFullBuild';
        if (!hasProp(configVps, prop, 'boolean') && !hasProp(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be a boolean' };
    }
    {
        const prop = 'includeAssetsImportedByServer';
        if (!hasProp(configVps, prop, 'boolean') && !hasProp(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be a boolean' };
    }
    {
        const prop = 'prerender';
        if (!hasProp(configVps, prop, 'object') &&
            !hasProp(configVps, prop, 'boolean') &&
            !hasProp(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be an object or a boolean' };
    }
    const configVpsPrerender = configVps.prerender;
    if (typeof configVpsPrerender === 'object') {
        {
            const p = 'partial';
            if (!hasProp(configVpsPrerender, p, 'boolean') && !hasProp(configVpsPrerender, p, 'undefined'))
                return { prop: `prerender.${p}`, errMsg: 'should be a boolean' };
        }
        {
            const p = 'noExtraDir';
            if (!hasProp(configVpsPrerender, p, 'boolean') && !hasProp(configVpsPrerender, p, 'undefined'))
                return { prop: `prerender.${p}`, errMsg: 'should be a boolean' };
        }
        {
            const p = 'disableAutoRun';
            if (!hasProp(configVpsPrerender, p, 'boolean') && !hasProp(configVpsPrerender, p, 'undefined'))
                return { prop: `prerender.${p}`, errMsg: 'should be a boolean' };
        }
        {
            const p = 'parallel';
            if (!hasProp(configVpsPrerender, p, 'boolean') &&
                !hasProp(configVpsPrerender, p, 'number') &&
                !hasProp(configVpsPrerender, p, 'undefined'))
                return { prop: `prerender.${p}`, errMsg: 'should be a boolean or a number' };
        }
    }
    return null;
}
