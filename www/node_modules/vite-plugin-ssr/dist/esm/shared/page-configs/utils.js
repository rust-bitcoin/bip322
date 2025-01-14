export { getConfigValue };
export { getPageConfig };
export { getConfigDefinedAtString };
export { getConfigDefinedAtInfo };
export { getDefinedAtString };
import { assert, assertUsage, getValuePrintable } from '../utils.js';
import pc from '@brillout/picocolors';
import { getExportPath } from './getExportPath.js';
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
function getConfigDefinedAtInfo(pageConfig, configName) {
    const configValue = getConfigValueEntry(pageConfig, configName);
    // We assume the caller to have ensured that the config value exists prior to calling getConfigDefinedAtInfo()
    assert(configValue);
    const { definedAtInfo } = configValue;
    // definedAtInfo is available only for config values that aren't:
    //  - computed, nor
    //  - cumulative
    assert(definedAtInfo);
    return definedAtInfo;
}
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
    assert(pageConfigs.length > 0);
    assert(pageConfig);
    return pageConfig;
}
function assertConfigValueType(value, type, configName, definedAtInfo) {
    assert(value !== null);
    const typeActual = typeof value;
    if (typeActual === type)
        return;
    const valuePrintable = getValuePrintable(value);
    const problem = valuePrintable !== null ? `value ${pc.cyan(valuePrintable)}` : `type ${pc.cyan(typeActual)}`;
    const configDefinedAt = getConfigDefinedAtString(configName, { definedAtInfo }, true);
    assertUsage(false, `${configDefinedAt} has an invalid ${problem}: is should be a ${pc.cyan(type)} instead`);
}
function getConfigDefinedAtString(configName, { definedAtInfo }, sentenceBegin, append) {
    let configDefinedAt = `${sentenceBegin ? `Config` : `config`} ${pc.cyan(configName)}`;
    if (definedAtInfo !== null) {
        configDefinedAt = `${configDefinedAt} defined at ${getDefinedAtString(definedAtInfo, append)}`;
    }
    return configDefinedAt;
}
function getDefinedAtString(definedAtInfo, append) {
    const { filePath, fileExportPath } = definedAtInfo;
    let definedAt = filePath;
    const exportPath = getExportPath(fileExportPath);
    if (exportPath) {
        definedAt = `${definedAt} > ${pc.cyan(exportPath)}`;
    }
    if (append) {
        definedAt = `${definedAt} > (${pc.blue(append)})`;
    }
    return definedAt;
}
