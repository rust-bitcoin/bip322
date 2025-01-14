"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVikeConfigFile = exports.vikeConfigDependencies = exports.reloadVikeConfig = exports.getVikeConfig = void 0;
const utils_js_1 = require("../../../utils.js");
const path_1 = __importDefault(require("path"));
const configDefinitionsBuiltIn_js_1 = require("./getVikeConfig/configDefinitionsBuiltIn.js");
const fast_glob_1 = __importDefault(require("fast-glob"));
const filesystemRouting_js_1 = require("./getVikeConfig/filesystemRouting.js");
const transpileAndExecuteFile_js_1 = require("./transpileAndExecuteFile.js");
const replaceImportStatements_js_1 = require("./replaceImportStatements.js");
const isConfigInvalid_js_1 = require("../../../../runtime/renderPage/isConfigInvalid.js");
const globalContext_js_1 = require("../../../../runtime/globalContext.js");
const loggerNotProd_js_1 = require("../../../shared/loggerNotProd.js");
const removeSuperfluousViteLog_js_1 = require("../../../shared/loggerVite/removeSuperfluousViteLog.js");
const getFilePathToShowToUser_js_1 = require("./getFilePathToShowToUser.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const module_1 = require("module");
const utils_js_2 = require("../../../../../shared/page-configs/utils.js");
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
(0, utils_js_1.assertIsNotProductionRuntime)();
let devServerIsCorrupt = false;
let wasConfigInvalid = null;
let vikeConfigPromise = null;
const vikeConfigDependencies = new Set();
exports.vikeConfigDependencies = vikeConfigDependencies;
const codeFilesEnv = new Map();
function reloadVikeConfig(userRootDir, extensions) {
    vikeConfigDependencies.clear();
    codeFilesEnv.clear();
    vikeConfigPromise = loadVikeConfig_withErrorHandling(userRootDir, true, extensions, true);
    handleReloadSideEffects();
}
exports.reloadVikeConfig = reloadVikeConfig;
async function handleReloadSideEffects() {
    wasConfigInvalid = isConfigInvalid_js_1.isConfigInvalid;
    const vikeConfigPromisePrevious = vikeConfigPromise;
    try {
        await vikeConfigPromise;
    }
    catch (err) {
        // handleReloadSideEffects() is only called in dev.
        // In dev, if loadVikeConfig_withErrorHandling() throws an error, then it's a vite-plugin-ssr bug.
        console.error(err);
        (0, utils_js_1.assert)(false);
    }
    if (vikeConfigPromise !== vikeConfigPromisePrevious) {
        // Let the next handleReloadSideEffects() call handle side effects
        return;
    }
    if (!isConfigInvalid_js_1.isConfigInvalid) {
        if (wasConfigInvalid) {
            wasConfigInvalid = false;
            (0, loggerNotProd_js_1.logConfigErrorRecover)();
        }
        if (devServerIsCorrupt) {
            devServerIsCorrupt = false;
            const viteDevServer = (0, globalContext_js_1.getViteDevServer)();
            (0, utils_js_1.assert)(viteDevServer);
            (0, removeSuperfluousViteLog_js_1.removeSuperfluousViteLog_enable)();
            await viteDevServer.restart(true);
            (0, removeSuperfluousViteLog_js_1.removeSuperfluousViteLog_disable)();
        }
    }
}
async function getVikeConfig(userRootDir, isDev, extensions, tolerateInvalidConfig = false) {
    if (!vikeConfigPromise) {
        vikeConfigPromise = loadVikeConfig_withErrorHandling(userRootDir, isDev, extensions, tolerateInvalidConfig);
    }
    return await vikeConfigPromise;
}
exports.getVikeConfig = getVikeConfig;
async function loadInterfaceFiles(userRootDir, isDev, extensions) {
    const plusFiles = await findPlusFiles(userRootDir, isDev, extensions);
    const configFiles = [];
    const valueFiles = [];
    plusFiles.forEach((f) => {
        if (getConfigName(f.filePathRelativeToUserRootDir) === 'config') {
            configFiles.push(f);
        }
        else {
            valueFiles.push(f);
        }
    });
    let interfaceFilesByLocationId = {};
    // Config files
    await Promise.all(configFiles.map(async ({ filePathAbsolute, filePathRelativeToUserRootDir }) => {
        const configFilePath = {
            filePathAbsolute: filePathAbsolute,
            filePathRelativeToUserRootDir: filePathRelativeToUserRootDir
        };
        const { configFile, extendsConfigs } = await loadConfigFile(configFilePath, userRootDir, []);
        const interfaceFile = getInterfaceFileFromConfigFile(configFile, false);
        const locationId = (0, filesystemRouting_js_1.getLocationId)(filePathRelativeToUserRootDir);
        interfaceFilesByLocationId[locationId] = interfaceFilesByLocationId[locationId] ?? [];
        interfaceFilesByLocationId[locationId].push(interfaceFile);
        extendsConfigs.forEach((extendsConfig) => {
            const interfaceFile = getInterfaceFileFromConfigFile(extendsConfig, true);
            interfaceFilesByLocationId[locationId].push(interfaceFile);
        });
    }));
    // Value files
    await Promise.all(valueFiles.map(async ({ filePathAbsolute, filePathRelativeToUserRootDir }) => {
        const configNameDefault = getConfigName(filePathRelativeToUserRootDir);
        (0, utils_js_1.assert)(configNameDefault);
        const interfaceFile = {
            filePath: {
                filePathRelativeToUserRootDir,
                filePathAbsolute
            },
            configMap: {
                [configNameDefault]: {}
            },
            isConfigFile: false,
            isValueFile: true,
            configNameDefault
        };
        {
            // We don't have access to custom config definitions yet
            //  - We load +someCustomConifg.js later
            //  - But we do need to eagerly load +meta.js (to get all the custom config definitions)
            const configDef = getConfigDefinitionOptional(configDefinitionsBuiltIn_js_1.configDefinitionsBuiltIn, configNameDefault);
            if (configDef?.env === 'config-only') {
                await loadValueFile(interfaceFile, configNameDefault, userRootDir);
            }
        }
        {
            const locationId = (0, filesystemRouting_js_1.getLocationId)(filePathRelativeToUserRootDir);
            interfaceFilesByLocationId[locationId] = interfaceFilesByLocationId[locationId] ?? [];
            interfaceFilesByLocationId[locationId].push(interfaceFile);
        }
    }));
    return interfaceFilesByLocationId;
}
function getConfigDefinition(configDefinitionsRelevant, configName, definedByFile) {
    const configDef = configDefinitionsRelevant[configName];
    assertConfigExists(configName, Object.keys(configDefinitionsRelevant), definedByFile);
    (0, utils_js_1.assert)(configDef);
    return configDef;
}
function getConfigDefinitionOptional(configDefinitions, configName) {
    return configDefinitions[configName] ?? null;
}
async function loadValueFile(interfaceValueFile, configNameDefault, userRootDir) {
    const { fileExports } = await (0, transpileAndExecuteFile_js_1.transpileAndExecuteFile)(interfaceValueFile.filePath, true, userRootDir);
    (0, utils_js_1.assertDefaultExportUnknown)(fileExports, (0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(interfaceValueFile.filePath));
    Object.entries(fileExports).forEach(([configName, configValue]) => {
        if (configName === 'default') {
            configName = configNameDefault;
        }
        interfaceValueFile.configMap[configName] = { configValue };
    });
}
function getInterfaceFileFromConfigFile(configFile, isConfigExtend) {
    const { fileExports, filePath, extendsFilePaths } = configFile;
    const interfaceFile = {
        filePath,
        configMap: {},
        isConfigFile: true,
        isValueFile: false,
        isConfigExtend,
        extendsFilePaths
    };
    const interfaceFilePathToShowToUser = (0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(filePath);
    (0, utils_js_1.assertDefaultExportObject)(fileExports, interfaceFilePathToShowToUser);
    Object.entries(fileExports.default).forEach(([configName, configValue]) => {
        interfaceFile.configMap[configName] = { configValue };
    });
    return interfaceFile;
}
async function loadVikeConfig_withErrorHandling(userRootDir, isDev, extensions, tolerateInvalidConfig) {
    let hasError = false;
    let ret;
    let err;
    try {
        ret = await loadVikeConfig(userRootDir, isDev, extensions);
    }
    catch (err_) {
        hasError = true;
        err = err_;
    }
    if (!hasError) {
        (0, utils_js_1.assert)(ret);
        (0, utils_js_1.assert)(err === undefined);
        (0, isConfigInvalid_js_1.isConfigInvalid_set)(false);
        return ret;
    }
    else {
        (0, utils_js_1.assert)(ret === undefined);
        (0, utils_js_1.assert)(err);
        (0, isConfigInvalid_js_1.isConfigInvalid_set)(true);
        if (!isDev) {
            (0, utils_js_1.assert)((0, globalContext_js_1.getViteDevServer)() === null);
            throw err;
        }
        else {
            (0, loggerNotProd_js_1.logConfigError)(err);
            if (!tolerateInvalidConfig) {
                devServerIsCorrupt = true;
            }
            const dummyData = {
                pageConfigs: [],
                pageConfigGlobal: {
                    onPrerenderStart: null,
                    onBeforeRoute: null
                },
                globalVikeConfig: {}
            };
            return dummyData;
        }
    }
}
async function loadVikeConfig(userRootDir, isDev, extensions) {
    const interfaceFilesByLocationId = await loadInterfaceFiles(userRootDir, isDev, extensions);
    const { globalVikeConfig, pageConfigGlobal } = getGlobalConfigs(interfaceFilesByLocationId, userRootDir);
    const pageConfigs = await Promise.all(Object.entries(interfaceFilesByLocationId)
        .filter(([_pageId, interfaceFiles]) => isDefiningPage(interfaceFiles))
        .map(async ([locationId]) => {
        const interfaceFilesRelevant = getInterfaceFilesRelevant(interfaceFilesByLocationId, locationId);
        const configDefinitionsRelevant = getConfigDefinitions(interfaceFilesRelevant);
        // Load value files of custom config-only configs
        await Promise.all(getInterfaceFileList(interfaceFilesRelevant).map(async (interfaceFile) => {
            if (!interfaceFile.isValueFile)
                return;
            const { configNameDefault } = interfaceFile;
            if (isGlobalConfig(configNameDefault))
                return;
            const configDef = getConfigDefinition(configDefinitionsRelevant, configNameDefault, (0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(interfaceFile.filePath));
            if (configDef.env !== 'config-only')
                return;
            const isAlreadyLoaded = interfacefileIsAlreaydLoaded(interfaceFile);
            if (isAlreadyLoaded)
                return;
            // Value files for built-in confg-only configs should have already been loaded at loadInterfaceFiles()
            (0, utils_js_1.assert)(!(configNameDefault in configDefinitionsBuiltIn_js_1.configDefinitionsBuiltIn));
            await loadValueFile(interfaceFile, configNameDefault, userRootDir);
        }));
        const configValueSources = {};
        (0, utils_js_1.objectEntries)(configDefinitionsRelevant)
            .filter(([configName]) => !isGlobalConfig(configName))
            .forEach(([configName, configDef]) => {
            const sources = resolveConfigValueSources(configName, configDef, interfaceFilesRelevant, userRootDir);
            if (!sources)
                return;
            configValueSources[configName] = sources;
        });
        const { routeFilesystem, isErrorPage } = determineRouteFilesystem(locationId, configValueSources);
        const pageConfig = {
            pageId: locationId,
            isErrorPage,
            routeFilesystem,
            configValueSources,
            configValues: getConfigValues(configValueSources, configDefinitionsRelevant)
        };
        applyEffects(pageConfig, configDefinitionsRelevant);
        pageConfig.configValues = getConfigValues(configValueSources, configDefinitionsRelevant);
        applyComputed(pageConfig, configDefinitionsRelevant);
        pageConfig.configValues = getConfigValues(configValueSources, configDefinitionsRelevant);
        return pageConfig;
    }));
    // Show error message upon unknown config
    Object.entries(interfaceFilesByLocationId).forEach(([locationId, interfaceFiles]) => {
        const interfaceFilesRelevant = getInterfaceFilesRelevant(interfaceFilesByLocationId, locationId);
        const configDefinitionsRelevant = getConfigDefinitions(interfaceFilesRelevant);
        interfaceFiles.forEach((interfaceFile) => {
            Object.keys(interfaceFile.configMap).forEach((configName) => {
                assertConfigExists(configName, Object.keys(configDefinitionsRelevant), (0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(interfaceFile.filePath));
            });
        });
    });
    return { pageConfigs, pageConfigGlobal, globalVikeConfig };
}
function interfacefileIsAlreaydLoaded(interfaceFile) {
    const configMapValues = Object.values(interfaceFile.configMap);
    const isAlreadyLoaded = configMapValues.some((conf) => 'configValue' in conf);
    if (isAlreadyLoaded) {
        (0, utils_js_1.assert)(configMapValues.every((conf) => 'configValue' in conf));
    }
    return isAlreadyLoaded;
}
function getInterfaceFilesRelevant(interfaceFilesByLocationId, locationIdPage) {
    const interfaceFilesRelevant = Object.fromEntries(Object.entries(interfaceFilesByLocationId)
        .filter(([locationId]) => {
        return (0, filesystemRouting_js_1.isInherited)(locationId, locationIdPage);
    })
        .sort(([locationId1], [locationId2]) => (0, filesystemRouting_js_1.sortAfterInheritanceOrder)(locationId1, locationId2, locationIdPage)));
    return interfaceFilesRelevant;
}
function getInterfaceFileList(interfaceFilesByLocationId) {
    const interfaceFiles = [];
    Object.values(interfaceFilesByLocationId).forEach((interfaceFiles_) => {
        interfaceFiles.push(...interfaceFiles_);
    });
    return interfaceFiles;
}
function getGlobalConfigs(interfaceFilesByLocationId, userRootDir) {
    const locationIds = Object.keys(interfaceFilesByLocationId);
    const interfaceFilesGlobal = Object.fromEntries(Object.entries(interfaceFilesByLocationId).filter(([locationId]) => {
        return (0, filesystemRouting_js_1.isGlobalLocation)(locationId, locationIds);
    }));
    // Validate that global configs live in global interface files
    {
        const interfaceFilesGlobalPaths = [];
        Object.entries(interfaceFilesGlobal).forEach(([locationId, interfaceFiles]) => {
            (0, utils_js_1.assert)((0, filesystemRouting_js_1.isGlobalLocation)(locationId, locationIds));
            interfaceFiles.forEach(({ filePath: { filePathRelativeToUserRootDir } }) => {
                if (filePathRelativeToUserRootDir) {
                    interfaceFilesGlobalPaths.push(filePathRelativeToUserRootDir);
                }
            });
        });
        const globalPaths = Array.from(new Set(interfaceFilesGlobalPaths.map((p) => path_1.default.posix.dirname(p))));
        Object.entries(interfaceFilesByLocationId).forEach(([locationId, interfaceFiles]) => {
            interfaceFiles.forEach((interfaceFile) => {
                Object.keys(interfaceFile.configMap).forEach((configName) => {
                    if (!(0, filesystemRouting_js_1.isGlobalLocation)(locationId, locationIds) && isGlobalConfig(configName)) {
                        (0, utils_js_1.assertUsage)(false, [
                            `${(0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(interfaceFile.filePath)} defines the config ${picocolors_1.default.cyan(configName)} which is global:`,
                            globalPaths.length
                                ? `define ${picocolors_1.default.cyan(configName)} in ${(0, utils_js_1.joinEnglish)(globalPaths, 'or')} instead`
                                : `create a global config (e.g. /pages/+config.js) and define ${picocolors_1.default.cyan(configName)} there instead`
                        ].join(' '));
                    }
                });
            });
        });
    }
    const globalVikeConfig = {};
    const pageConfigGlobal = {
        onBeforeRoute: null,
        onPrerenderStart: null
    };
    (0, utils_js_1.objectEntries)(configDefinitionsBuiltIn_js_1.configDefinitionsBuiltInGlobal).forEach(([configName, configDef]) => {
        const sources = resolveConfigValueSources(configName, configDef, interfaceFilesGlobal, userRootDir);
        const configValueSource = sources?.[0];
        if (!configValueSource)
            return;
        if ((0, utils_js_1.arrayIncludes)((0, utils_js_1.objectKeys)(pageConfigGlobal), configName)) {
            (0, utils_js_1.assert)(!('value' in configValueSource));
            pageConfigGlobal[configName] = configValueSource;
        }
        else {
            (0, utils_js_1.assert)('value' in configValueSource);
            if (configName === 'prerender' && typeof configValueSource.value === 'boolean')
                return;
            (0, utils_js_1.assert)(!configValueSource.isComputed);
            (0, utils_js_1.assertWarning)(false, `Being able to define config ${picocolors_1.default.cyan(configName)} in ${configValueSource.definedAtInfo.filePath} is experimental and will likely be removed. Define the config ${picocolors_1.default.cyan(configName)} in vite-plugin-ssr's Vite plugin options instead.`, { onlyOnce: true });
            globalVikeConfig[configName] = configValueSource.value;
        }
    });
    return { pageConfigGlobal, globalVikeConfig };
}
function resolveConfigValueSources(configName, configDef, interfaceFilesRelevant, userRootDir) {
    let sources = null;
    // interfaceFilesRelevant is sorted by sortAfterInheritanceOrder()
    for (const interfaceFiles of Object.values(interfaceFilesRelevant)) {
        const interfaceFilesDefiningConfig = interfaceFiles.filter((interfaceFile) => interfaceFile.configMap[configName]);
        if (interfaceFilesDefiningConfig.length === 0)
            continue;
        sources = sources ?? [];
        const visited = new WeakSet();
        const add = (interfaceFile) => {
            (0, utils_js_1.assert)(!visited.has(interfaceFile));
            visited.add(interfaceFile);
            const configValueSource = getConfigValueSource(configName, interfaceFile, configDef, userRootDir);
            sources.push(configValueSource);
        };
        // Main resolution logic
        {
            const interfaceValueFiles = interfaceFilesDefiningConfig
                .filter((interfaceFile) => interfaceFile.isValueFile &&
                // We consider side-effect exports (e.g. `export { frontmatter }` of .mdx files) later (i.e. with less priority)
                interfaceFile.configNameDefault === configName)
                .sort(makeOrderDeterministic);
            const interfaceConfigFiles = interfaceFilesDefiningConfig
                .filter((interfaceFile) => interfaceFile.isConfigFile &&
                // We consider value from extended configs (e.g. vike-react) later (i.e. with less priority)
                !interfaceFile.isConfigExtend)
                .sort(makeOrderDeterministic);
            const interfaceValueFile = interfaceValueFiles[0];
            const interfaceConfigFile = interfaceConfigFiles[0];
            // Make this value:
            //   /pages/some-page/+someConfig.js > `export default`
            // override that value:
            //   /pages/some-page/+config > `export default { someConfig }`
            const interfaceFileWinner = interfaceValueFile ?? interfaceConfigFile;
            if (interfaceFileWinner) {
                const interfaceFilesOverriden = [...interfaceValueFiles, ...interfaceConfigFiles].filter((f) => f !== interfaceFileWinner);
                // A user-land conflict of interfaceFiles with the same locationId means that the user has superfluously defined the config twice; the user should remove such redundancy making things unnecessarily ambiguous
                warnOverridenConfigValues(interfaceFileWinner, interfaceFilesOverriden, configName, configDef, userRootDir);
                [interfaceFileWinner, ...interfaceFilesOverriden].forEach((interfaceFile) => {
                    add(interfaceFile);
                });
            }
        }
        // Side-effect configs such as `export { frontmatter }` in .mdx files
        interfaceFilesDefiningConfig
            .filter((interfaceFile) => interfaceFile.isValueFile &&
            // Is side-effect export
            interfaceFile.configNameDefault !== configName)
            .forEach((interfaceValueFileSideEffect) => {
            add(interfaceValueFileSideEffect);
        });
        // extends
        interfaceFilesDefiningConfig
            .filter((interfaceFile) => interfaceFile.isConfigFile && interfaceFile.isConfigExtend)
            // extended config files are already sorted by inheritance order
            .forEach((interfaceFile) => {
            add(interfaceFile);
        });
        interfaceFilesDefiningConfig.forEach((interfaceFile) => {
            (0, utils_js_1.assert)(visited.has(interfaceFile));
        });
    }
    (0, utils_js_1.assert)(sources === null || sources.length > 0);
    return sources;
}
function makeOrderDeterministic(interfaceFile1, interfaceFile2) {
    return (0, utils_js_1.lowerFirst)((interfaceFile) => {
        const { filePathRelativeToUserRootDir } = interfaceFile.filePath;
        (0, utils_js_1.assert)(isInterfaceFileUserLand(interfaceFile));
        (0, utils_js_1.assert)(filePathRelativeToUserRootDir);
        return filePathRelativeToUserRootDir.length;
    })(interfaceFile1, interfaceFile2);
}
function warnOverridenConfigValues(interfaceFileWinner, interfaceFilesOverriden, configName, configDef, userRootDir) {
    interfaceFilesOverriden.forEach((interfaceFileLoser) => {
        const configValueSourceWinner = getConfigValueSource(configName, interfaceFileWinner, configDef, userRootDir);
        const configValueSourceLoser = getConfigValueSource(configName, interfaceFileLoser, configDef, userRootDir);
        (0, utils_js_1.assertWarning)(false, `${(0, utils_js_2.getConfigDefinedAtString)(configName, configValueSourceLoser, true)} overriden by another ${(0, utils_js_2.getConfigDefinedAtString)(configName, configValueSourceWinner, false)}, remove one of the two`, { onlyOnce: false });
    });
}
function isInterfaceFileUserLand(interfaceFile) {
    return (interfaceFile.isConfigFile && !interfaceFile.isConfigExtend) || interfaceFile.isValueFile;
}
function getConfigValueSource(configName, interfaceFile, configDef, userRootDir) {
    // TODO: rethink file paths of ConfigElement
    const configFilePath = interfaceFile.filePath.filePathRelativeToUserRootDir ?? interfaceFile.filePath.filePathAbsolute;
    const conf = interfaceFile.configMap[configName];
    (0, utils_js_1.assert)(conf);
    const configEnv = configDef.env;
    const definedAtInfoConfigFile = {
        filePath: configFilePath,
        fileExportPath: ['default', configName]
    };
    if (configDef._valueIsFilePath) {
        let filePath;
        if (interfaceFile.isConfigFile) {
            const { configValue } = conf;
            const import_ = getImport(configValue, interfaceFile.filePath, userRootDir);
            const configDefinedAt = (0, utils_js_2.getConfigDefinedAtString)(configName, { definedAtInfo: definedAtInfoConfigFile }, true);
            (0, utils_js_1.assertUsage)(import_, `${configDefinedAt} should be an import`);
            filePath = import_.importFilePath;
        }
        else {
            (0, utils_js_1.assert)(interfaceFile.isValueFile);
            filePath =
                interfaceFile.filePath.filePathRelativeToUserRootDir ??
                    // Experimental: is this needed? Would it work?
                    interfaceFile.filePath.filePathAbsolute;
        }
        const configValueSource = {
            value: filePath,
            valueIsFilePath: true,
            configEnv,
            valueIsImportedAtRuntime: true,
            isComputed: false,
            definedAtInfo: {
                filePath,
                fileExportPath: []
            }
        };
        return configValueSource;
    }
    if (interfaceFile.isConfigFile) {
        (0, utils_js_1.assert)('configValue' in conf);
        const { configValue } = conf;
        const import_ = getImport(configValue, interfaceFile.filePath, userRootDir);
        if (import_) {
            const { importFilePath, importFileExportName } = import_;
            assertCodeFileEnv(importFilePath, configEnv, configName);
            const configValueSource = {
                configEnv,
                valueIsImportedAtRuntime: true,
                isComputed: false,
                definedAtInfo: {
                    filePath: importFilePath,
                    fileExportPath: [importFileExportName]
                }
            };
            return configValueSource;
        }
        else {
            const configValueSource = {
                value: configValue,
                configEnv,
                valueIsImportedAtRuntime: false,
                isComputed: false,
                definedAtInfo: definedAtInfoConfigFile
            };
            return configValueSource;
        }
    }
    else if (interfaceFile.isValueFile) {
        // TODO: rethink file paths of ConfigElement
        const importFilePath = interfaceFile.filePath.filePathRelativeToUserRootDir ?? interfaceFile.filePath.filePathAbsolute;
        const importFileExportName = configName === interfaceFile.configNameDefault ? 'default' : configName;
        const valueAlreadyLoaded = 'configValue' in conf;
        const configValueSource = {
            configEnv,
            valueIsImportedAtRuntime: !valueAlreadyLoaded,
            isComputed: false,
            definedAtInfo: {
                filePath: importFilePath,
                fileExportPath: [importFileExportName]
            }
        };
        if (valueAlreadyLoaded) {
            configValueSource.value = conf.configValue;
        }
        else {
            (0, utils_js_1.assert)(configEnv !== 'config-only');
        }
        return configValueSource;
    }
    (0, utils_js_1.assert)(false);
}
function assertCodeFileEnv(importFilePath, configEnv, configName) {
    if (!codeFilesEnv.has(importFilePath)) {
        codeFilesEnv.set(importFilePath, []);
    }
    const codeFileEnv = codeFilesEnv.get(importFilePath);
    codeFileEnv.push({ configEnv, configName });
    const configDifferentEnv = codeFileEnv.filter((c) => c.configEnv !== configEnv)[0];
    if (configDifferentEnv) {
        (0, utils_js_1.assertUsage)(false, [
            `${importFilePath} defines the value of configs living in different environments:`,
            ...[configDifferentEnv, { configName, configEnv }].map((c) => `  - config ${picocolors_1.default.cyan(c.configName)} which value lives in environment ${picocolors_1.default.cyan(c.configEnv)}`),
            'Defining config values in the same file is allowed only if they live in the same environment, see https://vite-plugin-ssr.com/header-file/import-from-same-file'
        ].join('\n'));
    }
}
function isDefiningPage(interfaceFiles) {
    for (const interfaceFile of interfaceFiles) {
        const configNames = Object.keys(interfaceFile.configMap);
        if (configNames.some((configName) => isDefiningPageConfig(configName))) {
            return true;
        }
    }
    return false;
}
function isDefiningPageConfig(configName) {
    return ['Page', 'route'].includes(configName);
}
function getImport(configValue, configFilePath, userRootDir) {
    if (typeof configValue !== 'string')
        return null;
    const importData = (0, replaceImportStatements_js_1.parseImportData)(configValue);
    if (!importData)
        return null;
    let { importFilePath, importFileExportName } = importData;
    if (importFilePath.startsWith('.')) {
        // We need to resolve relative paths into absolute paths. Because the import paths are included in virtual files:
        // ```
        // [vite] Internal server error: Failed to resolve import "./onPageTransitionHooks" from "virtual:vite-plugin-ssr:pageConfigValuesAll:client:/pages/index". Does the file exist?
        // ```
        importFilePath = resolveRelativeCodeFilePath(importData, configFilePath, userRootDir);
    }
    else {
        // importFilePath can be:
        //  - an npm package import
        //  - a path alias
    }
    return {
        importFilePath,
        importFileExportName
    };
}
function resolveRelativeCodeFilePath(importData, configFilePath, userRootDir) {
    let importFilePath = resolveImport(importData, configFilePath);
    // Make it a Vite path
    (0, utils_js_1.assertPosixPath)(userRootDir);
    (0, utils_js_1.assertPosixPath)(importFilePath);
    if (importFilePath.startsWith(userRootDir)) {
        importFilePath = getVitePathFromAbsolutePath(importFilePath, userRootDir);
    }
    else {
        (0, utils_js_1.assertUsage)(false, `${(0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(configFilePath)} imports from a relative path ${picocolors_1.default.cyan(importData.importFilePath)} outside of ${userRootDir} which is forbidden: import from a relative path inside ${userRootDir}, or import from a dependency's package.json#exports entry instead`);
        // None of the following works. Seems to be a Vite bug?
        // /*
        // assert(importFilePath.startsWith('/'))
        // importFilePath = `/@fs${importFilePath}`
        // /*/
        // importFilePath = path.posix.relative(userRootDir, importFilePath)
        // assert(importFilePath.startsWith('../'))
        // importFilePath = '/' + importFilePath
        // //*/
    }
    (0, utils_js_1.assertPosixPath)(importFilePath);
    (0, utils_js_1.assert)(importFilePath.startsWith('/'));
    return importFilePath;
}
function getVitePathFromAbsolutePath(filePathAbsolute, root) {
    (0, utils_js_1.assertPosixPath)(filePathAbsolute);
    (0, utils_js_1.assertPosixPath)(root);
    (0, utils_js_1.assert)(filePathAbsolute.startsWith(root));
    let vitePath = path_1.default.posix.relative(root, filePathAbsolute);
    (0, utils_js_1.assert)(!vitePath.startsWith('/') && !vitePath.startsWith('.'));
    vitePath = '/' + vitePath;
    return vitePath;
}
function getConfigDefinitions(interfaceFilesRelevant) {
    const configDefinitions = { ...configDefinitionsBuiltIn_js_1.configDefinitionsBuiltIn };
    Object.entries(interfaceFilesRelevant).forEach(([_locationId, interfaceFiles]) => {
        interfaceFiles.forEach((interfaceFile) => {
            const configMeta = interfaceFile.configMap['meta'];
            if (!configMeta)
                return;
            const meta = configMeta.configValue;
            assertMetaValue(meta, 
            // Maybe we should use the getConfigDefinedAtString() helper?
            `Config ${picocolors_1.default.cyan('meta')} defined at ${(0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(interfaceFile.filePath)}`);
            (0, utils_js_1.objectEntries)(meta).forEach(([configName, configDefinition]) => {
                // User can override an existing config definition
                configDefinitions[configName] = {
                    ...configDefinitions[configName],
                    ...configDefinition
                };
            });
        });
    });
    return configDefinitions;
}
function assertMetaValue(metaVal, configMetaDefinedAt) {
    (0, utils_js_1.assertUsage)((0, utils_js_1.isObject)(metaVal), `${configMetaDefinedAt} has an invalid type ${picocolors_1.default.cyan(typeof metaVal)}: it should be an object instead.`);
    (0, utils_js_1.objectEntries)(metaVal).forEach(([configName, def]) => {
        (0, utils_js_1.assertUsage)((0, utils_js_1.isObject)(def), `${configMetaDefinedAt} sets meta.${configName} to a value with an invalid type ${picocolors_1.default.cyan(typeof def)}: it should be an object instead.`);
        // env
        {
            const envValues = [
                'client-only',
                'server-only',
                'server-and-client',
                'config-only'
            ];
            const hint = [
                `Set the value of ${picocolors_1.default.cyan('env')} to `,
                (0, utils_js_1.joinEnglish)(envValues.map((s) => picocolors_1.default.cyan(`'${s}'`)), 'or'),
                '.'
            ].join('');
            (0, utils_js_1.assertUsage)('env' in def, `${configMetaDefinedAt} doesn't set meta.${configName}.env but it's required. ${hint}`);
            (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(def, 'env', 'string'), `${configMetaDefinedAt} sets meta.${configName}.env to an invalid type ${picocolors_1.default.cyan(typeof def.env)}. ${hint}`);
            (0, utils_js_1.assertUsage)(envValues.includes(def.env), `${configMetaDefinedAt} sets meta.${configName}.env to an invalid value ${picocolors_1.default.cyan(`'${def.env}'`)}. ${hint}`);
        }
        // effect
        if ('effect' in def) {
            (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(def, 'effect', 'function'), `${configMetaDefinedAt} sets meta.${configName}.effect to an invalid type ${picocolors_1.default.cyan(typeof def.effect)}: it should be a function instead`);
            (0, utils_js_1.assertUsage)(def.env === 'config-only', `${configMetaDefinedAt} sets meta.${configName}.effect but it's only supported if meta.${configName}.env is ${picocolors_1.default.cyan('config-only')} (but it's ${picocolors_1.default.cyan(def.env)} instead)`);
        }
    });
}
function applyEffects(pageConfig, configDefinitionsRelevant) {
    (0, utils_js_1.objectEntries)(configDefinitionsRelevant).forEach(([configName, configDef]) => {
        if (!configDef.effect)
            return;
        // The value needs to be loaded at config time, that's why we only support effect for configs that are config-only for now.
        // (We could support effect for non config-only by always loading its value at config time, regardless of the config's `env` value.)
        (0, utils_js_1.assertWarning)(configDef.env === 'config-only', [
            `Adding an effect to ${picocolors_1.default.cyan(configName)} may not work as expected because ${picocolors_1.default.cyan(configName)} has an ${picocolors_1.default.cyan('env')} that is different than ${picocolors_1.default.cyan('config-only')} (its env is ${picocolors_1.default.cyan(configDef.env)}).`,
            'Reach out to a maintainer if you want to use this in production.'
        ].join(' '), { onlyOnce: true });
        const configValue = pageConfig.configValueSources[configName]?.[0];
        if (!configValue)
            return;
        const configModFromEffect = configDef.effect({
            configValue: configValue.value,
            configDefinedAt: (0, utils_js_2.getConfigDefinedAtString)(configName, configValue, true)
        });
        if (!configModFromEffect)
            return;
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(configValue, 'value')); // We need to assume that the config value is loaded at build-time
        applyEffect(configModFromEffect, configValue, pageConfig.configValueSources);
    });
}
function applyEffect(configModFromEffect, configValueEffectSource, configValueSources) {
    const notSupported = `config.meta[configName].effect currently only supports modifying the the ${picocolors_1.default.cyan('env')} of a config. Reach out to a maintainer if you need more capabilities.`;
    (0, utils_js_1.objectEntries)(configModFromEffect).forEach(([configName, configValue]) => {
        if (configName === 'meta') {
            assertMetaValue(configValue, (0, utils_js_2.getConfigDefinedAtString)(configName, configValueEffectSource, true, 'effect'));
            (0, utils_js_1.objectEntries)(configValue).forEach(([configTargetName, configTargetDef]) => {
                {
                    const keys = Object.keys(configTargetDef);
                    (0, utils_js_1.assertUsage)(keys.includes('env'), notSupported);
                    (0, utils_js_1.assertUsage)(keys.length === 1, notSupported);
                }
                const envOverriden = configTargetDef.env;
                const sources = configValueSources[configTargetName];
                sources?.forEach((configValueSource) => {
                    configValueSource.configEnv = envOverriden;
                });
            });
        }
        else {
            (0, utils_js_1.assertUsage)(false, notSupported);
            // If we do end implementing being able to set the value of a config:
            //  - For setting definedAtInfo: we could take the definedAtInfo of the effect config while appending '(effect)' to definedAtInfo.fileExportPath
        }
    });
}
function applyComputed(pageConfig, configDefinitionsRelevant) {
    (0, utils_js_1.objectEntries)(configDefinitionsRelevant).forEach(([configName, configDef]) => {
        var _a;
        const computed = configDef._computed;
        if (!computed)
            return;
        const value = computed(pageConfig);
        if (value === undefined)
            return;
        const configValueSource = {
            value,
            configEnv: configDef.env,
            definedAtInfo: null,
            isComputed: true,
            valueIsImportedAtRuntime: false
        };
        (_a = pageConfig.configValueSources)[configName] ?? (_a[configName] = []);
        // Computed values are inserted last: they have the least priority (i.e. computed can be overriden)
        pageConfig.configValueSources[configName].push(configValueSource);
    });
}
async function findPlusFiles(userRootDir, isDev, extensions) {
    const timeBase = new Date().getTime();
    (0, utils_js_1.assertPosixPath)(userRootDir);
    const result = await (0, fast_glob_1.default)(`**/+*.${utils_js_1.scriptFileExtensions}`, {
        ignore: [
            '**/node_modules/**',
            // Allow:
            // ```
            // +Page.js
            // +Page.telefunc.js
            // ```
            '**/*.telefunc.*'
        ],
        cwd: userRootDir,
        dot: false
    });
    const time = new Date().getTime() - timeBase;
    if (isDev) {
        // We only warn in dev, because while building it's expected to take a long time as fast-glob is competing for resources with other tasks
        (0, utils_js_1.assertWarning)(time < 2 * 1000, `Crawling your user files took an unexpected long time (${time}ms). Create a new issue on vite-plugin-ssr's GitHub.`, {
            onlyOnce: 'slow-page-files-search'
        });
    }
    const plusFiles = result.map((p) => {
        p = (0, utils_js_1.toPosixPath)(p);
        const filePathRelativeToUserRootDir = path_1.default.posix.join('/', p);
        const filePathAbsolute = path_1.default.posix.join(userRootDir, p);
        return { filePathRelativeToUserRootDir, filePathAbsolute };
    });
    extensions.forEach((extension) => {
        extension.pageConfigsDistFiles?.forEach((pageConfigDistFile) => {
            // TODO/v1-release: remove
            if (!pageConfigDistFile.importPath.includes('+'))
                return;
            (0, utils_js_1.assert)(pageConfigDistFile.importPath.includes('+'));
            (0, utils_js_1.assert)(path_1.default.posix.basename(pageConfigDistFile.importPath).startsWith('+'));
            const { importPath, filePath } = pageConfigDistFile;
            plusFiles.push({
                filePathRelativeToUserRootDir: importPath,
                filePathAbsolute: filePath
            });
        });
    });
    return plusFiles;
}
function getConfigName(filePath) {
    (0, utils_js_1.assertPosixPath)(filePath);
    if ((0, transpileAndExecuteFile_js_1.isTmpFile)(filePath))
        return null;
    const fileName = path_1.default.posix.basename(filePath);
    assertNoUnexpectedPlusSign(filePath, fileName);
    const basename = fileName.split('.')[0];
    if (!basename.startsWith('+')) {
        return null;
    }
    else {
        const configName = basename.slice(1);
        return configName;
    }
}
function assertNoUnexpectedPlusSign(filePath, fileName) {
    const dirs = path_1.default.posix.dirname(filePath).split('/');
    dirs.forEach((dir, i) => {
        const dirPath = dirs.slice(0, i + 1).join('/');
        (0, utils_js_1.assertUsage)(!dir.includes('+'), `Character '+' is a reserved character: remove '+' from the directory name ${dirPath}/`);
    });
    (0, utils_js_1.assertUsage)(!fileName.slice(1).includes('+'), `Character '+' is only allowed at the beginning of filenames: make sure ${filePath} doesn't contain any '+' in its filename other than its first letter`);
}
async function loadConfigFile(configFilePath, userRootDir, visited) {
    const { filePathAbsolute, filePathRelativeToUserRootDir } = configFilePath;
    assertNoInfiniteLoop(visited, filePathAbsolute);
    const { fileExports } = await (0, transpileAndExecuteFile_js_1.transpileAndExecuteFile)(configFilePath, false, userRootDir);
    const { extendsConfigs, extendsFilePaths } = await loadExtendsConfigs(fileExports, configFilePath, userRootDir, [
        ...visited,
        filePathAbsolute
    ]);
    const configFile = {
        fileExports,
        filePath: {
            filePathRelativeToUserRootDir,
            filePathAbsolute
        },
        extendsFilePaths
    };
    return { configFile, extendsConfigs };
}
function assertNoInfiniteLoop(visited, filePathAbsolute) {
    const idx = visited.indexOf(filePathAbsolute);
    if (idx === -1)
        return;
    const loop = visited.slice(idx);
    (0, utils_js_1.assert)(loop[0] === filePathAbsolute);
    (0, utils_js_1.assertUsage)(idx === -1, `Infinite extends loop ${[...loop, filePathAbsolute].join('>')}`);
}
async function loadExtendsConfigs(configFileExports, configFilePath, userRootDir, visited) {
    const extendsImportData = getExtendsImportData(configFileExports, configFilePath);
    const extendsConfigFiles = [];
    extendsImportData.map((importData) => {
        const { importFilePath: importPath } = importData;
        // TODO
        //  - validate extends configs
        const filePathAbsolute = resolveImport(importData, configFilePath);
        assertExtendsImportPath(importPath, filePathAbsolute, configFilePath);
        extendsConfigFiles.push({
            filePathAbsolute,
            // - filePathRelativeToUserRootDir has no functionality beyond nicer error messages for user
            // - Using importPath would be visually nicer but it's ambigous => we rather pick filePathAbsolute for added clarity
            filePathRelativeToUserRootDir: determineFilePathRelativeToUserDir(filePathAbsolute, userRootDir)
        });
    });
    const extendsConfigs = [];
    await Promise.all(extendsConfigFiles.map(async (configFilePath) => {
        const result = await loadConfigFile(configFilePath, userRootDir, visited);
        extendsConfigs.push(result.configFile);
        extendsConfigs.push(...result.extendsConfigs);
    }));
    const extendsFilePaths = extendsConfigFiles.map((f) => f.filePathAbsolute);
    return { extendsConfigs, extendsFilePaths };
}
function determineFilePathRelativeToUserDir(filePathAbsolute, userRootDir) {
    (0, utils_js_1.assertPosixPath)(filePathAbsolute);
    (0, utils_js_1.assertPosixPath)(userRootDir);
    if (!filePathAbsolute.startsWith(userRootDir)) {
        return null;
    }
    let filePathRelativeToUserRootDir = filePathAbsolute.slice(userRootDir.length);
    if (!filePathRelativeToUserRootDir.startsWith('/'))
        filePathRelativeToUserRootDir = '/' + filePathRelativeToUserRootDir;
    return filePathRelativeToUserRootDir;
}
function assertExtendsImportPath(importPath, filePath, configFilePath) {
    if ((0, utils_js_1.isNpmPackageImport)(importPath)) {
        const fileDir = path_1.default.posix.dirname(filePath) + '/';
        const fileName = path_1.default.posix.basename(filePath);
        const fileNameBaseCorrect = '+config';
        const [fileNameBase, ...fileNameRest] = fileName.split('.');
        const fileNameCorrect = [fileNameBaseCorrect, ...fileNameRest].join('.');
        (0, utils_js_1.assertWarning)(fileNameBase === fileNameBaseCorrect, `Rename ${fileName} to ${fileNameCorrect} in ${fileDir}`, {
            onlyOnce: true
        });
    }
    else {
        (0, utils_js_1.assertWarning)(false, `${(0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(configFilePath)} uses ${picocolors_1.default.cyan('extends')} to inherit from ${picocolors_1.default.cyan(importPath)} which is a user-land file: this is experimental and may be remove at any time. Reach out to a maintainer if you need this feature.`, { onlyOnce: true });
    }
}
function getExtendsImportData(configFileExports, configFilePath) {
    const filePathToShowToUser = (0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(configFilePath);
    (0, utils_js_1.assertDefaultExportObject)(configFileExports, filePathToShowToUser);
    const defaultExports = configFileExports.default;
    const wrongUsage = `${filePathToShowToUser} sets the config 'extends' to an invalid value, see https://vite-plugin-ssr.com/extends`;
    let extendList;
    if (!('extends' in defaultExports)) {
        return [];
    }
    else if ((0, utils_js_1.hasProp)(defaultExports, 'extends', 'string')) {
        extendList = [defaultExports.extends];
    }
    else if ((0, utils_js_1.hasProp)(defaultExports, 'extends', 'string[]')) {
        extendList = defaultExports.extends;
    }
    else {
        (0, utils_js_1.assertUsage)(false, wrongUsage);
    }
    const extendsImportData = extendList.map((importDataSerialized) => {
        const importData = (0, replaceImportStatements_js_1.parseImportData)(importDataSerialized);
        (0, utils_js_1.assertUsage)(importData, wrongUsage);
        return importData;
    });
    return extendsImportData;
}
// TODO: re-use this
function handleUserFileError(err, isDev) {
    // Properly handle error during transpilation so that we can use assertUsage() during transpilation
    if (isDev) {
        throw err;
    }
    else {
        // Avoid ugly error format:
        // ```
        // [vite-plugin-ssr:importUserCode] Could not load virtual:vite-plugin-ssr:importUserCode:server: [vite-plugin-ssr@0.4.70][Wrong Usage] /pages/+config.ts sets the config 'onRenderHtml' to the value './+config/onRenderHtml-i-dont-exist.js' but no file was found at /home/rom/code/vite-plugin-ssr/examples/v1/pages/+config/onRenderHtml-i-dont-exist.js
        // Error: [vite-plugin-ssr@0.4.70][Wrong Usage] /pages/+config.ts sets the config 'onRenderHtml' to the value './+config/onRenderHtml-i-dont-exist.js' but no file was found at /home/rom/code/vite-plugin-ssr/examples/v1/pages/+config/onRenderHtml-i-dont-exist.js
        //     at ...
        //     at ...
        //     at ...
        //     at ...
        //     at ...
        //     at ...
        //   code: 'PLUGIN_ERROR',
        //   plugin: 'vite-plugin-ssr:importUserCode',
        //   hook: 'load',
        //   watchFiles: [
        //     '/home/rom/code/vite-plugin-ssr/vite-plugin-ssr/dist/esm/node/importBuild.js',
        //     '\x00virtual:vite-plugin-ssr:importUserCode:server'
        //   ]
        // }
        //  ELIFECYCLE  Command failed with exit code 1.
        // ```
        console.log('');
        console.error(err);
        process.exit(1);
    }
}
function isGlobalConfig(configName) {
    if (configName === 'prerender')
        return false;
    const configNamesGlobal = getConfigNamesGlobal();
    return (0, utils_js_1.arrayIncludes)(configNamesGlobal, configName);
}
function getConfigNamesGlobal() {
    return Object.keys(configDefinitionsBuiltIn_js_1.configDefinitionsBuiltInGlobal);
}
function assertConfigExists(configName, configNamesRelevant, definedByFile) {
    const configNames = [...configNamesRelevant, ...getConfigNamesGlobal()];
    if (configNames.includes(configName))
        return;
    handleUnknownConfig(configName, configNames, definedByFile);
    (0, utils_js_1.assert)(false);
}
function handleUnknownConfig(configName, configNames, definedByFile) {
    let errMsg = `${definedByFile} defines an unknown config ${picocolors_1.default.cyan(configName)}`;
    let configNameSimilar = null;
    if (configName === 'page') {
        configNameSimilar = 'Page';
    }
    else {
        configNameSimilar = (0, utils_js_1.getMostSimilar)(configName, configNames);
    }
    if (configNameSimilar) {
        (0, utils_js_1.assert)(configNameSimilar !== configName);
        errMsg += `, did you mean to define ${picocolors_1.default.cyan(configNameSimilar)} instead?`;
    }
    if (configName === 'page') {
        (0, utils_js_1.assert)(configNameSimilar === 'Page');
        errMsg += ` (The name of the config ${picocolors_1.default.cyan('Page')} starts with a capital letter ${picocolors_1.default.cyan('P')} because it usually defines a UI component: a ubiquitous JavaScript convention is to start the name of UI components with a capital letter.)`;
    }
    (0, utils_js_1.assertUsage)(false, errMsg);
}
function determineRouteFilesystem(locationId, configValueSources) {
    const configName = 'filesystemRoutingRoot';
    const configFilesystemRoutingRoot = configValueSources[configName]?.[0];
    let filesystemRouteString = (0, filesystemRouting_js_1.getFilesystemRouteString)(locationId);
    if (determineIsErrorPage(filesystemRouteString)) {
        return { isErrorPage: true, routeFilesystem: null };
    }
    let filesystemRouteDefinedBy = (0, filesystemRouting_js_1.getFilesystemRouteDefinedBy)(locationId); // for log404()
    if (configFilesystemRoutingRoot) {
        const routingRoot = getFilesystemRoutingRootEffect(configFilesystemRoutingRoot, configName);
        if (routingRoot) {
            const { filesystemRoutingRootEffect, filesystemRoutingRootDefinedAt } = routingRoot;
            const debugInfo = { locationId, routeFilesystem: filesystemRouteString, configFilesystemRoutingRoot };
            (0, utils_js_1.assert)(filesystemRouteString.startsWith(filesystemRoutingRootEffect.before), debugInfo);
            filesystemRouteString = (0, filesystemRouting_js_1.applyFilesystemRoutingRootEffect)(filesystemRouteString, filesystemRoutingRootEffect);
            filesystemRouteDefinedBy = `${filesystemRouteDefinedBy} (with ${filesystemRoutingRootDefinedAt})`;
        }
    }
    (0, utils_js_1.assert)(filesystemRouteString.startsWith('/'));
    const routeFilesystem = {
        routeString: filesystemRouteString,
        definedBy: filesystemRouteDefinedBy
    };
    return { routeFilesystem, isErrorPage: false };
}
function getFilesystemRoutingRootEffect(configFilesystemRoutingRoot, configName) {
    (0, utils_js_1.assert)(configFilesystemRoutingRoot.configEnv === 'config-only');
    // Eagerly loaded since it's config-only
    (0, utils_js_1.assert)('value' in configFilesystemRoutingRoot);
    const { value } = configFilesystemRoutingRoot;
    const configDefinedAt = (0, utils_js_2.getConfigDefinedAtString)(configName, configFilesystemRoutingRoot, false);
    (0, utils_js_1.assertUsage)(typeof value === 'string', `${configDefinedAt} should be a string`);
    (0, utils_js_1.assertUsage)(value.startsWith('/'), `${configDefinedAt} is ${picocolors_1.default.cyan(value)} but it should start with a leading slash ${picocolors_1.default.cyan('/')}`);
    (0, utils_js_1.assert)(!configFilesystemRoutingRoot.isComputed);
    const before = (0, filesystemRouting_js_1.getFilesystemRouteString)((0, filesystemRouting_js_1.getLocationId)(configFilesystemRoutingRoot.definedAtInfo.filePath));
    const after = value;
    const filesystemRoutingRootEffect = { before, after };
    return { filesystemRoutingRootEffect, filesystemRoutingRootDefinedAt: configDefinedAt };
}
function determineIsErrorPage(routeFilesystem) {
    (0, utils_js_1.assertPosixPath)(routeFilesystem);
    return routeFilesystem.split('/').includes('_error');
}
function resolveImport(importData, importerFilePath) {
    const { filePathAbsolute } = importerFilePath;
    (0, utils_js_1.assertPosixPath)(filePathAbsolute);
    let plusConfigFilDirPathAbsolute = path_1.default.posix.dirname(filePathAbsolute);
    const clean = (0, utils_js_1.addFileExtensionsToRequireResolve)();
    let importedFile;
    try {
        importedFile = require_.resolve(importData.importFilePath, { paths: [plusConfigFilDirPathAbsolute] });
    }
    catch {
        importedFile = null;
    }
    finally {
        clean();
    }
    assertImport(importedFile, importData, importerFilePath);
    importedFile = (0, utils_js_1.toPosixPath)(importedFile);
    return importedFile;
}
function assertImport(importedFile, importData, importerFilePath) {
    const { importFilePath: importPath, importWasGenerated, importDataString } = importData;
    const filePathToShowToUser = (0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(importerFilePath);
    if (!importedFile) {
        const importPathString = picocolors_1.default.cyan(`'${importPath}'`);
        const errIntro = importWasGenerated
            ? `The import path ${importPathString} in ${filePathToShowToUser}`
            : `The import ${picocolors_1.default.cyan(importDataString)} defined in ${filePathToShowToUser}`;
        const errIntro2 = `${errIntro} couldn't be resolved: does ${importPathString}`;
        if (importPath.startsWith('.')) {
            (0, utils_js_1.assertUsage)(false, `${errIntro2} point to an existing file?`);
        }
        else {
            (0, utils_js_1.assertUsage)(false, `${errIntro2} exist?`);
        }
    }
}
function isVikeConfigFile(filePath) {
    return !!getConfigName(filePath);
}
exports.isVikeConfigFile = isVikeConfigFile;
function getConfigValues(configValueSources, configDefinitionsRelevant) {
    const configValues = {};
    Object.entries(configValueSources).forEach(([configName, sources]) => {
        const configDef = configDefinitionsRelevant[configName];
        (0, utils_js_1.assert)(configDef);
        if (!configDef.cumulative) {
            const configValueSource = sources[0];
            if ('value' in configValueSource) {
                const { value, definedAtInfo } = configValueSource;
                configValues[configName] = {
                    value,
                    definedAtInfo
                };
            }
        }
        else {
            const value = mergeCumulative(configName, sources);
            configValues[configName] = {
                value,
                definedAtInfo: null
            };
        }
    });
    return configValues;
}
function mergeCumulative(configName, configValueSources) {
    const valuesArr = [];
    const valuesSet = [];
    let configValueSourcePrevious = null;
    configValueSources.forEach((configValueSource) => {
        (0, utils_js_1.assert)(!configValueSource.isComputed);
        const configDefinedAt = (0, utils_js_2.getConfigDefinedAtString)(configName, configValueSource, true);
        const configNameColored = picocolors_1.default.cyan(configName);
        // We could, in principle, also support cumulative values to be defined in +${configName}.js but it ins't completely trivial to implement
        (0, utils_js_1.assertUsage)('value' in configValueSource, `${configDefinedAt} is only allowed to be defined in a +config.h.js file. (Because the values of ${configNameColored} are cumulative.)`);
        /* This is more confusing than adding value. For example, this explanation shouldn't be shown for the passToClient config.
        const explanation = `(Because the values of ${configNameColored} are cumulative and therefore merged together.)` as const
        */
        const assertNoMixing = (isSet) => {
            const vals1 = isSet ? valuesSet : valuesArr;
            const t1 = isSet ? 'a Set' : 'an array';
            const vals2 = !isSet ? valuesSet : valuesArr;
            const t2 = !isSet ? 'a Set' : 'an array';
            (0, utils_js_1.assert)(vals1.length > 0);
            if (vals2.length === 0)
                return;
            (0, utils_js_1.assert)(configValueSourcePrevious);
            const configPreviousDefinedAt = (0, utils_js_2.getConfigDefinedAtString)(configName, configValueSourcePrevious, false);
            (0, utils_js_1.assertUsage)(false, `${configDefinedAt} sets ${t1} but another ${configPreviousDefinedAt} sets ${t2} which is forbidden: the values must be all arrays or all sets (you cannot mix).`);
        };
        const { value } = configValueSource;
        if (Array.isArray(value)) {
            valuesArr.push(value);
            assertNoMixing(false);
        }
        else if (value instanceof Set) {
            valuesSet.push(value);
            assertNoMixing(true);
        }
        else {
            (0, utils_js_1.assertUsage)(false, `${configDefinedAt} must be an array or a Set`);
        }
        configValueSourcePrevious = configValueSource;
    });
    if (valuesArr.length > 0) {
        (0, utils_js_1.assert)(valuesSet.length === 0);
        const result = (0, utils_js_1.mergeCumulativeValues)(valuesArr);
        (0, utils_js_1.assert)(result !== null);
        return result;
    }
    if (valuesSet.length > 0) {
        (0, utils_js_1.assert)(valuesArr.length === 0);
        const result = (0, utils_js_1.mergeCumulativeValues)(valuesSet);
        (0, utils_js_1.assert)(result !== null);
        return result;
    }
    (0, utils_js_1.assert)(false);
}
