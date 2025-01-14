"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPageCode = void 0;
const utils_js_1 = require("../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function loadPageCode(pageConfig, isDev) {
    if (pageConfig.isLoaded &&
        // We don't need to cache in dev, since Vite already caches the virtual module
        !isDev) {
        return pageConfig;
    }
    const codeFiles = await pageConfig.loadConfigValuesAll();
    // TODO: remove?
    // pageConfig.configValuesOld = pageConfig.configValuesOld.filter((val) => !val.definedByCodeFile)
    const addConfigValue = (configName, value, filePath, exportName) => {
        /* TODO
        assert(!isAlreadyDefined(val.configName), val.configName) // Conflicts are resolved upstream
        */
        pageConfig.configValues[configName] = {
            value,
            definedAtInfo: {
                filePath,
                fileExportPath: [exportName]
            }
            /* TODO: remove?
            definedByCodeFile: true
            */
        };
        assertIsNotNull(value, configName, filePath);
    };
    codeFiles.forEach((codeFile) => {
        if (codeFile.isPlusFile) {
            const { importFileExports, importFilePath } = codeFile;
            if (codeFile.configName !== 'client') {
                (0, utils_js_1.assertDefaultExportUnknown)(importFileExports, importFilePath);
            }
            Object.entries(importFileExports).forEach(([exportName, exportValue]) => {
                const isSideExport = exportName !== 'default'; // .md files may have "side-exports" such as `export { frontmatter }`
                const configName = isSideExport ? exportName : codeFile.configName;
                if (isSideExport && configName in pageConfig.configValues) {
                    // We can't avoid side-export conflicts upstream. (Because we cannot know about side-exports upstream at build-time.)
                    // Side-exports have the lowest priority.
                    return;
                }
                addConfigValue(configName, exportValue, importFilePath, exportName);
            });
        }
        else {
            const { configName, importFilePath, importFileExportValue, importFileExportName } = codeFile;
            addConfigValue(configName, importFileExportValue, importFilePath, importFileExportName);
        }
    });
    (0, utils_js_1.objectAssign)(pageConfig, { isLoaded: true });
    return pageConfig;
}
exports.loadPageCode = loadPageCode;
function assertIsNotNull(configValue, configName, importFilePath) {
    (0, utils_js_1.assert)(!importFilePath.includes('+config.'));
    (0, utils_js_1.assertUsage)(configValue !== null, `Set ${picocolors_1.default.cyan(configName)} to ${picocolors_1.default.cyan('null')} in a +config.h.js file instead of ${importFilePath}`);
}
