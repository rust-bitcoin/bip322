"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefinedAtString = exports.getConfigDefinedAtInfo = exports.getConfigDefinedAtString = exports.getPageConfig = exports.getConfigValue = void 0;
const utils_js_1 = require("../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const getExportPath_js_1 = require("./getExportPath.js");
// prettier-ignore
function getConfigValue(pageConfig, configName, type) {
    const configValue = getConfigValueEntry(pageConfig, configName);
    if (configValue === null)
        return null;
    const { value, definedAtInfo } = configValue;
    if (type)
        assertConfigValueType(value, type, configName, definedAtInfo);
    return { value };
}
exports.getConfigValue = getConfigValue;
function getConfigDefinedAtInfo(pageConfig, configName) {
    const configValue = getConfigValueEntry(pageConfig, configName);
    // We assume the caller to have ensured that the config value exists prior to calling getConfigDefinedAtInfo()
    (0, utils_js_1.assert)(configValue);
    const { definedAtInfo } = configValue;
    // definedAtInfo is available only for config values that aren't:
    //  - computed, nor
    //  - cumulative
    (0, utils_js_1.assert)(definedAtInfo);
    return definedAtInfo;
}
exports.getConfigDefinedAtInfo = getConfigDefinedAtInfo;
function getConfigValueEntry(pageConfig, configName) {
    const configValue = pageConfig.configValues[configName];
    if (!configValue)
        return null;
    const { value, definedAtInfo } = configValue;
    // Enable users to suppress global config values by setting the local config value to null
    if (value === null)
        return null;
    return { value, definedAtInfo };
}
function getPageConfig(pageId, pageConfigs) {
    const pageConfig = pageConfigs.find((p) => p.pageId === pageId);
    (0, utils_js_1.assert)(pageConfigs.length > 0);
    (0, utils_js_1.assert)(pageConfig);
    return pageConfig;
}
exports.getPageConfig = getPageConfig;
function assertConfigValueType(value, type, configName, definedAtInfo) {
    (0, utils_js_1.assert)(value !== null);
    const typeActual = typeof value;
    if (typeActual === type)
        return;
    const valuePrintable = (0, utils_js_1.getValuePrintable)(value);
    const problem = valuePrintable !== null ? `value ${picocolors_1.default.cyan(valuePrintable)}` : `type ${picocolors_1.default.cyan(typeActual)}`;
    const configDefinedAt = getConfigDefinedAtString(configName, { definedAtInfo }, true);
    (0, utils_js_1.assertUsage)(false, `${configDefinedAt} has an invalid ${problem}: is should be a ${picocolors_1.default.cyan(type)} instead`);
}
function getConfigDefinedAtString(configName, { definedAtInfo }, sentenceBegin, append) {
    let configDefinedAt = `${sentenceBegin ? `Config` : `config`} ${picocolors_1.default.cyan(configName)}`;
    if (definedAtInfo !== null) {
        configDefinedAt = `${configDefinedAt} defined at ${getDefinedAtString(definedAtInfo, append)}`;
    }
    return configDefinedAt;
}
exports.getConfigDefinedAtString = getConfigDefinedAtString;
function getDefinedAtString(definedAtInfo, append) {
    const { filePath, fileExportPath } = definedAtInfo;
    let definedAt = filePath;
    const exportPath = (0, getExportPath_js_1.getExportPath)(fileExportPath);
    if (exportPath) {
        definedAt = `${definedAt} > ${picocolors_1.default.cyan(exportPath)}`;
    }
    if (append) {
        definedAt = `${definedAt} > (${picocolors_1.default.blue(append)})`;
    }
    return definedAt;
}
exports.getDefinedAtString = getDefinedAtString;
