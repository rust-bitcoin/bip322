"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getPageFiles_js_1 = require("../../../shared/getPageFiles.js");
const utils_js_1 = require("../utils.js");
const globalContext_js_1 = require("../globalContext.js");
const virtualFileImportUserCode_js_1 = require("../../shared/virtual-files/virtualFileImportUserCode.js");
(0, getPageFiles_js_1.setPageFilesAsync)(getPageFilesExports);
async function getPageFilesExports() {
    const viteDevServer = (0, globalContext_js_1.getViteDevServer)();
    (0, utils_js_1.assert)(viteDevServer);
    let moduleExports;
    try {
        moduleExports = await viteDevServer.ssrLoadModule(virtualFileImportUserCode_js_1.virtualFileIdImportUserCodeServer);
    }
    catch (err) {
        (0, utils_js_1.debugGlob)(`Glob error: ${virtualFileImportUserCode_js_1.virtualFileIdImportUserCodeServer} transpile error: `, err);
        throw err;
    }
    moduleExports = moduleExports.default || moduleExports;
    (0, utils_js_1.debugGlob)('Glob result: ', moduleExports);
    (0, utils_js_1.assert)((0, utils_js_1.isObject)(moduleExports));
    return moduleExports;
}
