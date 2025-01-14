"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigValueSourcesRelevant = exports.getConfigValueSource = void 0;
const utils_js_1 = require("../../shared/utils.js");
(0, utils_js_1.assertIsNotBrowser)();
function getConfigValueSource(pageConfig, configName) {
    // Doesn't exist on the client-side, but we are on the server-side as attested by assertIsNotBrowser()
    (0, utils_js_1.assert)(pageConfig.configValueSources);
    const sources = pageConfig.configValueSources[configName];
    if (!sources)
        return null;
    const configValueSource = sources[0];
    (0, utils_js_1.assert)(configValueSource);
    return configValueSource;
}
exports.getConfigValueSource = getConfigValueSource;
function getConfigValueSourcesRelevant(pageConfig) {
    const configValueSourcesRelevant = Object.entries(pageConfig.configValueSources).map(([configName, sources]) => {
        const configValueSource = sources[0];
        (0, utils_js_1.assert)(configValueSource);
        return { configName, ...configValueSource };
    });
    return configValueSourcesRelevant;
}
exports.getConfigValueSourcesRelevant = getConfigValueSourcesRelevant;
