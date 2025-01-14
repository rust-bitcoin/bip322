export { generateEagerImport };
let varCounterGlobal = 0;
function generateEagerImport(importPath, varCounter, importName) {
    if (varCounter === undefined)
        varCounter = varCounterGlobal++;
    const importVar = `import_${varCounter}`;
    const importLiteral = (() => {
        if (!importName || importName === '*') {
            return `* as ${importVar}`;
        }
        if (importName === 'default') {
            return importVar;
        }
        return `{ ${importName} as ${importVar} }`;
    })();
    const importStatement = `import ${importLiteral} from '${importPath}';`;
    return { importVar, importStatement };
}
