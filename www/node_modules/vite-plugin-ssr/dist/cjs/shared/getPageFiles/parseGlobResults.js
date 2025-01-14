"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGlobResults = void 0;
const utils_js_1 = require("../utils.js");
const assertExports_js_1 = require("./assertExports.js");
const getPageFileObject_js_1 = require("./getPageFileObject.js");
const fileTypes_js_1 = require("./fileTypes.js");
const assertPageConfigs_js_1 = require("./assertPageConfigs.js");
function parseGlobResults(pageFilesExports) {
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports, 'isGeneratedFile'));
    (0, utils_js_1.assert)(pageFilesExports.isGeneratedFile !== false, `vite-plugin-ssr was re-installed(/re-built). Restart your app.`);
    (0, utils_js_1.assert)(pageFilesExports.isGeneratedFile === true, `\`isGeneratedFile === ${pageFilesExports.isGeneratedFile}\``);
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports, 'pageFilesLazy', 'object'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports, 'pageFilesEager', 'object'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports, 'pageFilesExportNamesLazy', 'object'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports, 'pageFilesExportNamesEager', 'object'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports.pageFilesLazy, '.page'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports.pageFilesLazy, '.page.client') || (0, utils_js_1.hasProp)(pageFilesExports.pageFilesLazy, '.page.server'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports, 'pageFilesList', 'string[]'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports, 'pageConfigs'));
    (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageFilesExports, 'pageConfigGlobal'));
    const { pageConfigs, pageConfigGlobal } = pageFilesExports;
    (0, assertPageConfigs_js_1.assertPageConfigs)(pageConfigs);
    parsePageConfigs(pageConfigs);
    (0, assertPageConfigs_js_1.assertPageConfigGlobal)(pageConfigGlobal);
    const pageFilesMap = {};
    parseGlobResult(pageFilesExports.pageFilesLazy).forEach(({ filePath, pageFile, globValue }) => {
        pageFile = pageFilesMap[filePath] = pageFilesMap[filePath] ?? pageFile;
        const loadModule = globValue;
        assertLoadModule(loadModule);
        pageFile.loadFile = async () => {
            if (!('fileExports' in pageFile)) {
                pageFile.fileExports = await loadModule();
                (0, assertExports_js_1.assertExportValues)(pageFile);
            }
        };
    });
    parseGlobResult(pageFilesExports.pageFilesExportNamesLazy).forEach(({ filePath, pageFile, globValue }) => {
        pageFile = pageFilesMap[filePath] = pageFilesMap[filePath] ?? pageFile;
        const loadModule = globValue;
        assertLoadModule(loadModule);
        pageFile.loadExportNames = async () => {
            if (!('exportNames' in pageFile)) {
                const moduleExports = await loadModule();
                // Vite 2 seems to choke following assertion: https://github.com/brillout/vite-plugin-ssr/issues/455
                (0, utils_js_1.assertUsage)('exportNames' in moduleExports, 'You seem to be using Vite 2 but the latest vite-plugin-ssr versions only work with Vite 3');
                (0, utils_js_1.assert)((0, utils_js_1.hasProp)(moduleExports, 'exportNames', 'string[]'), pageFile.filePath);
                pageFile.exportNames = moduleExports.exportNames;
            }
        };
    });
    // `pageFilesEager` contains `.page.route.js` files
    parseGlobResult(pageFilesExports.pageFilesEager).forEach(({ filePath, pageFile, globValue }) => {
        pageFile = pageFilesMap[filePath] = pageFilesMap[filePath] ?? pageFile;
        const moduleExports = globValue;
        (0, utils_js_1.assert)((0, utils_js_1.isObject)(moduleExports));
        pageFile.fileExports = moduleExports;
    });
    parseGlobResult(pageFilesExports.pageFilesExportNamesEager).forEach(({ filePath, pageFile, globValue }) => {
        pageFile = pageFilesMap[filePath] = pageFilesMap[filePath] ?? pageFile;
        const moduleExports = globValue;
        (0, utils_js_1.assert)((0, utils_js_1.isObject)(moduleExports));
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(moduleExports, 'exportNames', 'string[]'), pageFile.filePath);
        pageFile.exportNames = moduleExports.exportNames;
    });
    pageFilesExports.pageFilesList.forEach((filePath) => {
        pageFilesMap[filePath] = pageFilesMap[filePath] ?? (0, getPageFileObject_js_1.getPageFileObject)(filePath);
    });
    const pageFiles = Object.values(pageFilesMap);
    pageFiles.forEach(({ filePath }) => {
        (0, utils_js_1.assert)(!filePath.includes('\\'));
    });
    return { pageFiles, pageConfigs, pageConfigGlobal };
}
exports.parseGlobResults = parseGlobResults;
function parseGlobResult(globObject) {
    const ret = [];
    Object.entries(globObject).forEach(([fileType, globFiles]) => {
        (0, utils_js_1.cast)(fileType);
        (0, utils_js_1.assert)(fileTypes_js_1.fileTypes.includes(fileType));
        (0, utils_js_1.assert)((0, utils_js_1.isObject)(globFiles));
        Object.entries(globFiles).forEach(([filePath, globValue]) => {
            const pageFile = (0, getPageFileObject_js_1.getPageFileObject)(filePath);
            (0, utils_js_1.assert)(pageFile.fileType === fileType);
            ret.push({ filePath, pageFile, globValue });
        });
    });
    return ret;
}
function assertLoadModule(globValue) {
    (0, utils_js_1.assert)((0, utils_js_1.isCallable)(globValue));
}
function parsePageConfigs(pageConfigs) {
    // TODO: remove
    /*
    pageConfigs.forEach((pageConfig) => {
      Object.entries(pageConfig.configElements).forEach(([configName, configElement]) => {
        {
          const { configValueSerialized } = configElement
          if (configValueSerialized !== undefined) {
            configElement.configValue = parse(configValueSerialized)
          }
        }
        if (configName === 'route') {
          assertRouteConfigValue(configElement)
        }
      })
    })
    */
}
// TODO: use again
// function assertRouteConfigValue(configElement: ConfigElement) {
//   assert(hasProp(configElement, 'configValue')) // route files are eagerly loaded
//   const { configValue } = configElement
//   const configValueType = typeof configValue
//   assertUsage(
//     configValueType === 'string' || isCallable(configValue),
//     `${configElement.configDefinedAt} has an invalid type '${configValueType}': it should be a string or a function instead, see https://vite-plugin-ssr.com/route`
//   )
//   /* We don't do that to avoid unnecessarily bloating the client-side bundle when using Server Routing
//    *  - When using Server Routing, this file is loaded as well
//    *  - When using Server Routing, client-side validation is superfluous as Route Strings only need to be validated on the server-side
//   if (typeof configValue === 'string') {
//     assertRouteString(configValue, `${configElement.configDefinedAt} defines an`)
//   }
//   */
// }
