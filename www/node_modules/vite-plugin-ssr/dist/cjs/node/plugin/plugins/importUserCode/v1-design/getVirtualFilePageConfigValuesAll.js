"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVirtualFilePageConfigValuesAll = void 0;
const utils_js_1 = require("../../../utils.js");
const generateEagerImport_js_1 = require("../generateEagerImport.js");
const virtualFilePageConfigValuesAll_js_1 = require("../../../../shared/virtual-files/virtualFilePageConfigValuesAll.js");
const getVikeConfig_js_1 = require("./getVikeConfig.js");
const extractAssetsQuery_js_1 = require("../../../../shared/extractAssetsQuery.js");
const debug_js_1 = require("./debug.js");
const path_1 = __importDefault(require("path"));
const utils_js_2 = require("../../../../../shared/page-configs/utils.js");
const getConfigValueSource_js_1 = require("../../../shared/getConfigValueSource.js");
const isConfigEnvMatch_js_1 = require("./isConfigEnvMatch.js");
async function getVirtualFilePageConfigValuesAll(id, userRootDir, isDev, configVps) {
    const result = (0, virtualFilePageConfigValuesAll_js_1.isVirtualFileIdPageConfigValuesAll)(id);
    (0, utils_js_1.assert)(result);
    /* This assertion fails when using includeAssetsImportedByServer
    {
      const isForClientSide = !config.build.ssr
      assert(result.isForClientSide === isForClientSide)
    }
    */
    const { pageId, isForClientSide } = result;
    const { pageConfigs } = await (0, getVikeConfig_js_1.getVikeConfig)(userRootDir, isDev, configVps.extensions, true);
    const pageConfig = pageConfigs.find((pageConfig) => pageConfig.pageId === pageId);
    (0, utils_js_1.assert)(pageConfig);
    const code = getLoadConfigValuesAll(pageConfig, isForClientSide, pageId, configVps.includeAssetsImportedByServer, isDev);
    (0, debug_js_1.debug)(id, isForClientSide ? 'CLIENT-SIDE' : 'SERVER-SIDE', code);
    return code;
}
exports.getVirtualFilePageConfigValuesAll = getVirtualFilePageConfigValuesAll;
function getLoadConfigValuesAll(pageConfig, isForClientSide, pageId, includeAssetsImportedByServer, isDev) {
    const configValue = (0, utils_js_2.getConfigValue)(pageConfig, 'clientRouting', 'boolean');
    const isClientRouting = configValue?.value ?? false;
    const lines = [];
    const importStatements = [];
    lines.push('export default [');
    let varCounter = 0;
    (0, getConfigValueSource_js_1.getConfigValueSourcesRelevant)(pageConfig).forEach((configValueSource) => {
        const { valueIsImportedAtRuntime, configName, configEnv, definedAtInfo } = configValueSource;
        if (!valueIsImportedAtRuntime)
            return;
        if (configValueSource.valueIsFilePath)
            return;
        if (!(0, isConfigEnvMatch_js_1.isConfigEnvMatch)(configEnv, isForClientSide, isClientRouting))
            return;
        const { filePath, fileExportPath } = definedAtInfo;
        (0, utils_js_1.assertPosixPath)(filePath);
        const fileName = path_1.default.posix.basename(filePath);
        const isPlusFile = fileName.startsWith('+');
        const fileExportName = fileExportPath[0];
        (0, utils_js_1.assert)(!configValueSource.valueIsFilePath);
        (0, utils_js_1.assert)(fileExportName);
        const { importVar, importStatement } = (0, generateEagerImport_js_1.generateEagerImport)(filePath, varCounter++, isPlusFile ? undefined : fileExportName);
        importStatements.push(importStatement);
        lines.push(`  {`);
        lines.push(`    configName: '${configName}',`);
        lines.push(`    importFilePath: '${filePath}',`);
        lines.push(`    isPlusFile: ${JSON.stringify(isPlusFile)},`);
        if (isPlusFile) {
            lines.push(`    importFileExports: ${importVar},`);
        }
        else {
            lines.push(`    importFileExportValue: ${importVar},`);
            (0, utils_js_1.assert)(fileExportName);
            lines.push(`    importFileExportName: ${JSON.stringify(fileExportName)},`);
        }
        lines.push(`  },`);
    });
    lines.push('];');
    if (includeAssetsImportedByServer && isForClientSide && !isDev) {
        lines.push(`import '${(0, extractAssetsQuery_js_1.extractAssetsAddQuery)((0, virtualFilePageConfigValuesAll_js_1.getVirtualFileIdPageConfigValuesAll)(pageId, false))}'`);
    }
    const code = [...importStatements, ...lines].join('\n');
    return code;
}
