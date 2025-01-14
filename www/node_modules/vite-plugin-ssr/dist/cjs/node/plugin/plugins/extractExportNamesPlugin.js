"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractExportNamesRE = exports.isUsingClientRouter = exports.extractExportNamesPlugin = void 0;
const utils_js_1 = require("../utils.js");
const parseEsModule_js_1 = require("../shared/parseEsModule.js");
const removeSourceMap_js_1 = require("../shared/removeSourceMap.js");
const extractExportNamesRE = /(\?|&)extractExportNames(?:&|$)/;
exports.extractExportNamesRE = extractExportNamesRE;
const debugNamespace = 'vps:extractExportNames';
const debug = (0, utils_js_1.createDebugger)(debugNamespace);
const debugEnabled = (0, utils_js_1.isDebugEnabled)(debugNamespace);
const globalObject = (0, utils_js_1.getGlobalObject)('extractExportNamesPlugin.ts', {});
function extractExportNamesPlugin() {
    let isDev = false;
    return {
        name: 'vite-plugin-ssr:extractExportNames',
        enforce: 'post',
        async transform(src, id, options) {
            const isClientSide = !(0, utils_js_1.viteIsSSR_options)(options);
            if (extractExportNamesRE.test(id)) {
                const code = await getExtractExportNamesCode(src, isClientSide, !isDev, id);
                debug('id ' + id, ['result:\n' + code.code.trim(), 'src:\n' + src.trim()]);
                return code;
            }
        },
        configureServer() {
            isDev = true;
        },
        config() {
            if (debugEnabled) {
                return { logLevel: 'silent' };
            }
        }
    };
}
exports.extractExportNamesPlugin = extractExportNamesPlugin;
async function getExtractExportNamesCode(src, isClientSide, isProduction, id) {
    const { exportNames, wildcardReExports } = await (0, parseEsModule_js_1.getExportNames)(src);
    if (isClientSide && exportNames.includes('clientRouting')) {
        globalObject.usesClientRouter = true;
    }
    const code = getCode(exportNames, wildcardReExports, isClientSide, isProduction, id);
    return (0, removeSourceMap_js_1.removeSourceMap)(code);
}
function getCode(exportNames, wildcardReExports, isClientSide, isProduction, id) {
    let code = '';
    const reExportVarNames = wildcardReExports.map((reExportedModuleName, i) => {
        const varName = `m${i}`;
        code += `import { exportNames as ${varName} } from '${addQuery(reExportedModuleName, id)}'`;
        code += '\n';
        return varName;
    });
    code += '\n';
    code += `export const exportNames = [${[
        ...exportNames.map((n) => JSON.stringify(n)),
        ...reExportVarNames.map((varName) => `...${varName}`)
    ].join(', ')}];`;
    code = injectHmr(code, isClientSide, isProduction);
    return code;
}
function addQuery(moduleName, id) {
    if (moduleName.includes('?')) {
        (0, utils_js_1.assert)(moduleName.split('?').length === 2);
        moduleName = moduleName.replace('?', '?extractExportNames&');
    }
    else {
        const fileExtension = (0, utils_js_1.getFileExtension)(moduleName);
        if (!fileExtension) {
            (0, utils_js_1.assert)(extractExportNamesRE.test(id));
            const idReal = id.split('?')[0];
            (0, utils_js_1.assertUsage)(false, `Modify the re-export of ${idReal}, see https://github.com/brillout/vite-plugin-ssr/issues/864#issuecomment-1537202290`);
        }
        moduleName = `${moduleName}?extractExportNames&lang.${fileExtension}`;
    }
    return moduleName;
}
function injectHmr(code, isClientSide, isProduction) {
    if (isProduction) {
        return code;
    }
    if (isClientSide) {
        code += '\n';
        code += `if (import.meta.hot) import.meta.hot.accept((mod) => { exportNames.length=0; exportNames.push(...mod.exportNames); });`;
    }
    else {
        // Ensure Vite considers the module as `isSelfAccepting`. (Needed because Vite's module graph erroneously conflates the Vite server-side modules with their client-side counterparts.)
        code += '\n';
        code += 'if(false){import.meta.hot.accept(()=>{})};';
    }
    return code;
}
function isUsingClientRouter() {
    return globalObject.usesClientRouter === true;
}
exports.isUsingClientRouter = isUsingClientRouter;
