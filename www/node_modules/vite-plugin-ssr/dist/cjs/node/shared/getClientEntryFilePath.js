"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientEntryFilePath = void 0;
const utils_js_1 = require("../../shared/page-configs/utils.js");
const utils_js_2 = require("./utils.js");
function getClientEntryFilePath(pageConfig) {
    const configName = 'client';
    const configValue = (0, utils_js_1.getConfigValue)(pageConfig, configName, 'string');
    if (!configValue)
        return null;
    const definedAtInfo = (0, utils_js_1.getConfigDefinedAtInfo)(pageConfig, configName);
    const { value } = configValue;
    // Users should be able to suppress client entry by setting its value to null
    (0, utils_js_2.assert)(value !== null);
    const clientEntryFilePath = definedAtInfo.filePath;
    return clientEntryFilePath;
}
exports.getClientEntryFilePath = getClientEntryFilePath;
