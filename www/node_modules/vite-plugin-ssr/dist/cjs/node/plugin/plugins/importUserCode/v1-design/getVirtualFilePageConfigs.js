"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVirtualFilePageConfigs = void 0;
const utils_js_1 = require("../../../utils.js");
const generateEagerImport_js_1 = require("../generateEagerImport.js");
const virtualFilePageConfigValuesAll_js_1 = require("../../../../shared/virtual-files/virtualFilePageConfigValuesAll.js");
const debug_js_1 = require("./debug.js");
const stringify_1 = require("@brillout/json-serializer/stringify");
const helpers_js_1 = require("./helpers.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const getVikeConfig_js_1 = require("./getVikeConfig.js");
const isConfigEnvMatch_js_1 = require("./isConfigEnvMatch.js");
async function getVirtualFilePageConfigs(userRootDir, isForClientSide, isDev, id, configVps, isClientRouting) {
    const { pageConfigs, pageConfigGlobal } = await (0, getVikeConfig_js_1.getVikeConfig)(userRootDir, isDev, configVps.extensions, true);
    return getContent(pageConfigs, pageConfigGlobal, isForClientSide, isDev, id, isClientRouting);
}
exports.getVirtualFilePageConfigs = getVirtualFilePageConfigs;
function getContent(pageConfigs, pageConfigGlobal, isForClientSide, isDev, id, isClientRouting) {
    const lines = [];
    const importStatements = [];
    lines.push('export const pageConfigs = [');
    pageConfigs.forEach((pageConfig) => {
        const { pageId, routeFilesystem, isErrorPage } = pageConfig;
        const virtualFileIdPageConfigValuesAll = (0, virtualFilePageConfigValuesAll_js_1.getVirtualFileIdPageConfigValuesAll)(pageId, isForClientSide);
        lines.push(`  {`);
        lines.push(`    pageId: ${JSON.stringify(pageId)},`);
        lines.push(`    isErrorPage: ${JSON.stringify(isErrorPage)},`);
        lines.push(`    routeFilesystem: ${JSON.stringify(routeFilesystem)},`);
        lines.push(`    loadConfigValuesAll: async () => (await import(${JSON.stringify(virtualFileIdPageConfigValuesAll)})).default,`);
        lines.push(`    configValues: {`);
        Object.entries(pageConfig.configValueSources).forEach(([configName, sources]) => {
            const configValue = pageConfig.configValues[configName];
            if (configValue) {
                const configEnv = (0, helpers_js_1.getConfigEnv)(pageConfig, configName);
                (0, utils_js_1.assert)(configEnv, configName);
                if (!(0, isConfigEnvMatch_js_1.isConfigEnvMatch)(configEnv, isForClientSide, isClientRouting))
                    return;
                const { value, definedAtInfo } = configValue;
                // TODO: use @brillout/json-serializer
                //  - re-use getConfigValueSerialized()?
                const valueSerialized = JSON.stringify(value);
                serializeConfigValue(lines, configName, { definedAtInfo }, valueSerialized);
            }
            else {
                const configValueSource = sources[0];
                (0, utils_js_1.assert)(configValueSource);
                if (configValueSource.configEnv === '_routing-eager') {
                    const { definedAtInfo } = configValueSource;
                    const configValue = { configName, definedAtInfo };
                    (0, utils_js_1.assert)(!configValueSource.isComputed);
                    const { filePath, fileExportPath } = configValueSource.definedAtInfo;
                    const [exportName] = fileExportPath;
                    (0, utils_js_1.assert)(exportName);
                    const configValueEagerImport = getConfigValueEagerImport(filePath, exportName, importStatements);
                    serializeConfigValue(lines, configName, configValue, configValueEagerImport);
                }
            }
        });
        lines.push(`    },`);
        lines.push(`  },`);
    });
    lines.push('];');
    lines.push('export const pageConfigGlobal = {');
    (0, utils_js_1.objectEntries)(pageConfigGlobal).forEach(([configName, configValueSource]) => {
        if (configName === 'onBeforeRoute') {
            // if( isForClientSide && !isClientRouting ) return
        }
        else if (configName === 'onPrerenderStart') {
            if (isDev || isForClientSide) {
                // Only load onPrerenderStart() in server production runtime
                configValueSource = null;
            }
        }
        else {
            (0, utils_js_1.assert)(false);
        }
        let whitespace = '  ';
        let content;
        if (configValueSource === null) {
            content = 'null,';
        }
        else {
            content = serializeConfigValueSource(configValueSource, configName, whitespace, isForClientSide, isClientRouting, importStatements, true);
            (0, utils_js_1.assert)(content.startsWith('{') && content.endsWith('},') && content.includes('\n'));
        }
        content = `${whitespace}[${JSON.stringify(configName)}]: ${content}`;
        lines.push(content);
    });
    lines.push('};');
    const code = [...importStatements, ...lines].join('\n');
    (0, debug_js_1.debug)(id, isForClientSide ? 'CLIENT-SIDE' : 'SERVER-SIDE', code);
    return code;
}
function serializeConfigValue(lines, configName, configValue, valueSerialized) {
    let whitespace = '      ';
    lines.push(`${whitespace}['${configName}']: {`);
    whitespace += '  ';
    lines.push(`${whitespace}  value: ${valueSerialized},`);
    Object.entries(configValue).forEach(([key, val]) => {
        if (key === 'value')
            return;
        // if (val === undefined) return
        lines.push(`${whitespace}  ${key}: ${JSON.stringify(val)},`);
    });
    whitespace = whitespace.slice(2);
    lines.push(`${whitespace}},`);
}
function serializeConfigValueSource(configValueSource, configName, whitespace, isForClientSide, isClientRouting, importStatements, isGlobalConfig) {
    (0, utils_js_1.assert)(!configValueSource.isComputed);
    const { definedAtInfo, configEnv } = configValueSource;
    const lines = [];
    lines.push(`{`);
    lines.push(`${whitespace}  definedAtInfo: ${JSON.stringify(definedAtInfo)},`);
    lines.push(`${whitespace}  configEnv: ${JSON.stringify(configEnv)},`);
    const eager = configValueSource.configEnv === '_routing-eager' || isGlobalConfig;
    if ((0, isConfigEnvMatch_js_1.isConfigEnvMatch)(configEnv, isForClientSide, isClientRouting) || eager) {
        if ('value' in configValueSource) {
            const { value } = configValueSource;
            const valueSerialized = getConfigValueSerialized(value, configName, definedAtInfo.filePath);
            lines.push(`${whitespace}  valueSerialized: ${valueSerialized}`);
        }
        else if (eager) {
            const { filePath, fileExportPath } = configValueSource.definedAtInfo;
            const [exportName] = fileExportPath;
            (0, utils_js_1.assert)(exportName);
            const configValueEagerImport = getConfigValueEagerImport(filePath, exportName, importStatements);
            lines.push(`${whitespace}  value: ${configValueEagerImport},`);
        }
    }
    lines.push(`${whitespace}},`);
    return lines.join('\n');
}
function getConfigValueSerialized(value, configName, configDefinedByFile) {
    let configValueSerialized;
    const valueName = `config${(0, utils_js_1.getPropAccessNotation)(configName)}`;
    try {
        configValueSerialized = (0, stringify_1.stringify)(value, { valueName });
    }
    catch (err) {
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(err, 'messageCore', 'string'));
        (0, utils_js_1.assertUsage)(false, [
            `The value of the config ${picocolors_1.default.cyan(configName)} cannot be defined inside the file ${configDefinedByFile}.`,
            `Its value must be defined in an another file and then imported by ${configDefinedByFile} (because it isn't serializable: ${err.messageCore}).`,
            `Only serializable config values can be defined inside ${configDefinedByFile}, see https://vite-plugin-ssr.com/header-file.`
        ].join(' '));
    }
    configValueSerialized = JSON.stringify(configValueSerialized);
    return configValueSerialized;
}
function getConfigValueEagerImport(importFilePath, exportName, importStatements) {
    let configValueEagerImport;
    const { importVar, importStatement } = (0, generateEagerImport_js_1.generateEagerImport)(importFilePath);
    importStatements.push(importStatement);
    // TODO: expose all exports so that assertDefaultExport can be applied
    configValueEagerImport = `${importVar}[${JSON.stringify(exportName)}]`;
    return configValueEagerImport;
}
