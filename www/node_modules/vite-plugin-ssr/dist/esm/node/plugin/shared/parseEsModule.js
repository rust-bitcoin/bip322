export { getExportNames };
export { getImportStatements };
import { init, parse } from 'es-module-lexer';
import { assert } from '../utils.js';
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
            assert(n);
            wildcardReExports.push(n);
        }
    });
    return { wildcardReExports, exportNames };
}
async function getImportStatements(src) {
    const parseResult = await parseEsModule(src);
    const imports = parseResult[0].slice();
    return imports;
}
async function parseEsModule(src) {
    await init;
    return parse(src);
}
