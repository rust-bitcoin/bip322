export { loadPageCode };
import { assert, assertDefaultExportUnknown, assertUsage, objectAssign } from '../utils.js';
import pc from '@brillout/picocolors';
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
                assertDefaultExportUnknown(importFileExports, importFilePath);
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
    objectAssign(pageConfig, { isLoaded: true });
    return pageConfig;
}
function assertIsNotNull(configValue, configName, importFilePath) {
    assert(!importFilePath.includes('+config.'));
    assertUsage(configValue !== null, `Set ${pc.cyan(configName)} to ${pc.cyan('null')} in a +config.h.js file instead of ${importFilePath}`);
}
