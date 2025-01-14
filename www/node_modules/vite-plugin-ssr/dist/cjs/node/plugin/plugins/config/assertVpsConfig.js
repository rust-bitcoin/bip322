"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertVpsConfig = void 0;
const utils_js_1 = require("../../utils.js");
function assertVpsConfig(vikeConfig, wrongUsageMsg) {
    const wrongUsageError = checkConfigVps(vikeConfig);
    if (wrongUsageError) {
        (0, utils_js_1.assertUsage)(false, wrongUsageMsg(wrongUsageError));
    }
}
exports.assertVpsConfig = assertVpsConfig;
function checkConfigVps(configVps) {
    (0, utils_js_1.assert)((0, utils_js_1.isObject)(configVps));
    {
        const prop = 'disableUrlNormalization';
        if (!(0, utils_js_1.hasProp)(configVps, prop, 'boolean') && !(0, utils_js_1.hasProp)(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be a boolean' };
    }
    {
        const prop = 'trailingSlash';
        if (!(0, utils_js_1.hasProp)(configVps, prop, 'boolean') && !(0, utils_js_1.hasProp)(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be a boolean' };
    }
    {
        const prop = 'redirects';
        const { redirects } = configVps;
        if (!(redirects === undefined ||
            ((0, utils_js_1.isObject)(redirects) && Object.values(redirects).every((v) => typeof v === 'string'))))
            return { prop, errMsg: 'should be an object of strings' };
    }
    {
        const prop = 'disableAutoFullBuild';
        if (!(0, utils_js_1.hasProp)(configVps, prop, 'boolean') && !(0, utils_js_1.hasProp)(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be a boolean' };
    }
    {
        const prop = 'includeAssetsImportedByServer';
        if (!(0, utils_js_1.hasProp)(configVps, prop, 'boolean') && !(0, utils_js_1.hasProp)(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be a boolean' };
    }
    {
        const prop = 'prerender';
        if (!(0, utils_js_1.hasProp)(configVps, prop, 'object') &&
            !(0, utils_js_1.hasProp)(configVps, prop, 'boolean') &&
            !(0, utils_js_1.hasProp)(configVps, prop, 'undefined'))
            return { prop, errMsg: 'should be an object or a boolean' };
    }
    const configVpsPrerender = configVps.prerender;
    if (typeof configVpsPrerender === 'object') {
        {
            const p = 'partial';
            if (!(0, utils_js_1.hasProp)(configVpsPrerender, p, 'boolean') && !(0, utils_js_1.hasProp)(configVpsPrerender, p, 'undefined'))
                return { prop: `prerender.${p}`, errMsg: 'should be a boolean' };
        }
        {
            const p = 'noExtraDir';
            if (!(0, utils_js_1.hasProp)(configVpsPrerender, p, 'boolean') && !(0, utils_js_1.hasProp)(configVpsPrerender, p, 'undefined'))
                return { prop: `prerender.${p}`, errMsg: 'should be a boolean' };
        }
        {
            const p = 'disableAutoRun';
            if (!(0, utils_js_1.hasProp)(configVpsPrerender, p, 'boolean') && !(0, utils_js_1.hasProp)(configVpsPrerender, p, 'undefined'))
                return { prop: `prerender.${p}`, errMsg: 'should be a boolean' };
        }
        {
            const p = 'parallel';
            if (!(0, utils_js_1.hasProp)(configVpsPrerender, p, 'boolean') &&
                !(0, utils_js_1.hasProp)(configVpsPrerender, p, 'number') &&
                !(0, utils_js_1.hasProp)(configVpsPrerender, p, 'undefined'))
                return { prop: `prerender.${p}`, errMsg: 'should be a boolean or a number' };
        }
    }
    return null;
}
