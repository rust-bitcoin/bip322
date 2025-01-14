"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConfigSet = exports.getConfigEnv = void 0;
const getConfigValueSource_js_1 = require("../../../shared/getConfigValueSource.js");
const utils_js_1 = require("../../../utils.js");
(0, utils_js_1.assertIsNotProductionRuntime)();
function getConfigEnv(pageConfig, configName) {
    const configValueSource = (0, getConfigValueSource_js_1.getConfigValueSource)(pageConfig, configName);
    if (!configValueSource)
        return null;
    if (configValueSource) {
        return configValueSource.configEnv;
    }
    else {
        // In case of effect/computed config values, there isn't any configValueSource
        // TODO: make it work for custom config definitions
        //  - Ideally set configValueSource also for effect/computed config values?
        (0, utils_js_1.assert)(false, 'TODO');
        /*
        const configDef = configDefinitionsBuiltIn[configName as keyof typeof configDefinitionsBuiltIn]
        if (!configDef) return null
        return configDef.env
        */
    }
}
exports.getConfigEnv = getConfigEnv;
function isConfigSet(pageConfig, configName) {
    const configValueSource = (0, getConfigValueSource_js_1.getConfigValueSource)(pageConfig, configName);
    // Enable users to suppress global config values by overriding the config's value to null
    if (configValueSource?.value === null)
        return false;
    return !!configValueSource;
}
exports.isConfigSet = isConfigSet;
