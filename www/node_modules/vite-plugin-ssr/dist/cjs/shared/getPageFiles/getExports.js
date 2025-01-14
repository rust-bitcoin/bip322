"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExports = exports.getExportUnion = void 0;
const isScriptFile_js_1 = require("../../utils/isScriptFile.js");
const utils_js_1 = require("../utils.js");
const assertExports_js_1 = require("./assertExports.js");
const utils_js_2 = require("../page-configs/utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function getExports(pageFiles, pageConfig) {
    const configEntries = {};
    const config = {};
    const exportsAll = {};
    // V0.4 design
    // TODO/v1-release: remove
    pageFiles.forEach((pageFile) => {
        const exportValues = getExportValues(pageFile);
        exportValues.forEach(({ exportName, exportValue, isFromDefaultExport }) => {
            (0, utils_js_1.assert)(exportName !== 'default');
            exportsAll[exportName] = exportsAll[exportName] ?? [];
            exportsAll[exportName].push({
                exportValue,
                exportSource: `${pageFile.filePath} > ${isFromDefaultExport ? `\`export default { ${exportName} }\`` : `\`export { ${exportName} }\``}`,
                filePath: pageFile.filePath,
                _filePath: pageFile.filePath,
                _fileType: pageFile.fileType,
                _isFromDefaultExport: isFromDefaultExport
            });
        });
    });
    // V1 design
    if (pageConfig) {
        Object.entries(pageConfig.configValues).forEach(([configName, configValue]) => {
            const { value, definedAtInfo } = configValue;
            let filePath = null;
            if (definedAtInfo) {
                filePath = definedAtInfo.filePath;
            }
            const configDefinedAt = (0, utils_js_2.getConfigDefinedAtString)(configName, configValue, true);
            config[configName] = config[configName] ?? value;
            configEntries[configName] = configEntries[configName] ?? [];
            // Currently each configName has only one entry. Adding an entry for each overriden config value isn't implemented yet. (This is an isomorphic file and it isn't clear whether this can/should be implemented on the client-side. We should load a minimum amount of code on the client-side.)
            (0, utils_js_1.assert)(configEntries[configName].length === 0);
            configEntries[configName].push({
                configValue: value,
                configDefinedAt,
                configDefinedByFile: filePath
            });
            // TODO/v1-release: remove
            const exportName = configName;
            exportsAll[exportName] = exportsAll[exportName] ?? [];
            exportsAll[exportName].push({
                exportValue: value,
                exportSource: configDefinedAt,
                filePath,
                _filePath: filePath,
                _fileType: null,
                _isFromDefaultExport: null
            });
        });
    }
    const pageExports = createObjectWithDeprecationWarning();
    const exports = {};
    Object.entries(exportsAll).forEach(([exportName, values]) => {
        values.forEach(({ exportValue, _fileType, _isFromDefaultExport }) => {
            exports[exportName] = exports[exportName] ?? exportValue;
            // Legacy pageContext.pageExports
            if (_fileType === '.page' && !_isFromDefaultExport) {
                if (!(exportName in pageExports)) {
                    pageExports[exportName] = exportValue;
                }
            }
        });
    });
    (0, utils_js_1.assert)(!('default' in exports));
    (0, utils_js_1.assert)(!('default' in exportsAll));
    return {
        config,
        configEntries,
        // TODO/v1-release: remove
        exports,
        exportsAll,
        pageExports
    };
}
exports.getExports = getExports;
function getExportValues(pageFile) {
    const { filePath, fileExports } = pageFile;
    (0, utils_js_1.assert)(fileExports); // assume pageFile.loadFile() was called
    (0, utils_js_1.assert)((0, isScriptFile_js_1.isScriptFile)(filePath));
    const exportValues = [];
    Object.entries(fileExports)
        .sort((0, utils_js_1.makeLast)(([exportName]) => exportName === 'default')) // `export { bla }` should override `export default { bla }`
        .forEach(([exportName, exportValue]) => {
        let isFromDefaultExport = exportName === 'default';
        if (isFromDefaultExport) {
            if ((0, isScriptFile_js_1.isTemplateFile)(filePath)) {
                exportName = 'Page';
            }
            else {
                (0, utils_js_1.assertUsage)((0, utils_js_1.isObject)(exportValue), `The ${picocolors_1.default.cyan('export default')} of ${filePath} should be an object.`);
                Object.entries(exportValue).forEach(([defaultExportName, defaultExportValue]) => {
                    (0, assertExports_js_1.assertDefaultExports)(defaultExportName, filePath);
                    exportValues.push({
                        exportName: defaultExportName,
                        exportValue: defaultExportValue,
                        isFromDefaultExport
                    });
                });
                return;
            }
        }
        exportValues.push({
            exportName,
            exportValue,
            isFromDefaultExport
        });
    });
    exportValues.forEach(({ exportName, isFromDefaultExport }) => {
        (0, utils_js_1.assert)(!(isFromDefaultExport && assertExports_js_1.forbiddenDefaultExports.includes(exportName)));
    });
    return exportValues;
}
// TODO/v1-release: remove
function createObjectWithDeprecationWarning() {
    return new Proxy({}, {
        get(...args) {
            // We only show the warning in Node.js because when using Client Routing Vue integration uses `Object.assign(pageContextReactive, pageContext)` which will wrongully trigger the warning. There is no cross-browser way to catch whether the property accessor was initiated by an `Object.assign()` call.
            if (!(0, utils_js_1.isBrowser)()) {
                (0, utils_js_1.assertWarning)(false, '`pageContext.pageExports` is outdated. Use `pageContext.exports` instead, see https://vite-plugin-ssr.com/exports', { onlyOnce: true, showStackTrace: true });
            }
            return Reflect.get(...args);
        }
    });
}
function getExportUnion(exportsAll, propName) {
    return (exportsAll[propName]
        ?.map((e) => {
        (0, utils_js_1.assertUsage)((0, utils_js_1.hasProp)(e, 'exportValue', 'string[]'), `${e.exportSource} should be an array of strings.`);
        return e.exportValue;
    })
        .flat() ?? []);
}
exports.getExportUnion = getExportUnion;
