"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImportStatements = exports.getExportNames = void 0;
const es_module_lexer_1 = require("es-module-lexer");
const utils_js_1 = require("../utils.js");
async function getExportNames(src) {
    const parseResult = await parseEsModule(src);
    const [imports, exports] = parseResult;
    const exportNames = exports.map((e) => e.n);
    // This seems to be the only way to detect re-exports
    //  - https://github.com/brillout/es-module-lexer_tests
    //  - https://github.com/vitejs/vite/blob/8469bf0a5e38cbf08ec28e598ab155d339edc442/packages/vite/src/node/optimizer/index.ts#L978-L981
    const wildcardReExports = [];
    imports.forEach(({ n, ss, se }) => {
        const exp = src.slice(ss, se);
        if (/export\s+\*\s+from/.test(exp)) {
            // `n` is `undefined` for dynamic imports with variable, e.g. `import(moduleName)`
            (0, utils_js_1.assert)(n);
            wildcardReExports.push(n);
        }
    });
    return { wildcardReExports, exportNames };
}
exports.getExportNames = getExportNames;
async function getImportStatements(src) {
    const parseResult = await parseEsModule(src);
    const imports = parseResult[0].slice();
    return imports;
}
exports.getImportStatements = getImportStatements;
async function parseEsModule(src) {
    await es_module_lexer_1.init;
    return (0, es_module_lexer_1.parse)(src);
}
