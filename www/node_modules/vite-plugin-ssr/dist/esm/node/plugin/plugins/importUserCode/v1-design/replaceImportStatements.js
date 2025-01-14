export { replaceImportStatements };
export { parseImportData };
export { isImportData };
// Playground: https://github.com/brillout/acorn-playground
import { parse } from 'acorn';
import { assert, assertUsage, assertWarning, styleFileRE } from '../../../utils.js';
import pc from '@brillout/picocolors';
function replaceImportStatements(code, filePathToShowToUser) {
    const spliceOperations = [];
    const fileImports = [];
    const imports = getImports(code);
    if (imports.length === 0)
        return { noImportStatement: true };
    imports.forEach((node) => {
        if (node.type !== 'ImportDeclaration')
            return;
        const importFilePath = node.source.value;
        assert(typeof importFilePath === 'string');
        const { start, end } = node;
        const importStatementCode = code.slice(start, end);
        // No variable imported
        if (node.specifiers.length === 0) {
            const isWarning = !styleFileRE.test(importFilePath);
            let quote = indent(importStatementCode);
            if (isWarning) {
                quote = pc.cyan(quote);
            }
            else {
                quote = pc.bold(pc.red(quote));
            }
            const errMsg = [
                `As explained in https://vite-plugin-ssr.com/header-file the following import in ${filePathToShowToUser} has no effect:`,
                quote
            ].join('\n');
            if (!isWarning) {
                assertUsage(false, errMsg);
            }
            assertWarning(false, errMsg, { onlyOnce: true });
        }
        let replacement = '';
        node.specifiers.forEach((specifier) => {
            assert(specifier.type === 'ImportSpecifier' ||
                specifier.type === 'ImportDefaultSpecifier' ||
                specifier.type === 'ImportNamespaceSpecifier');
            const importLocalName = specifier.local.name;
            const importFileExportName = (() => {
                if (specifier.type === 'ImportDefaultSpecifier')
                    return 'default';
                if (specifier.type === 'ImportNamespaceSpecifier')
                    return '*';
                {
                    const imported = specifier.imported;
                    if (imported)
                        return imported.name;
                }
                return importLocalName;
            })();
            const importDataString = serializeImportData({ importFilePath, importFileExportName, importWasGenerated: true });
            replacement += `const ${importLocalName} = '${importDataString}';`;
            fileImports.push({
                importStatementCode,
                importDataString,
                importLocalName
            });
        });
        spliceOperations.push({
            start,
            end,
            replacement
        });
    });
    const codeMod = spliceMany(code, spliceOperations);
    return { code: codeMod, fileImports, noImportStatement: false };
}
function getImports(code) {
    const { body } = parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module'
        // https://github.com/acornjs/acorn/issues/1136
    });
    const imports = [];
    body.forEach((node) => {
        if (node.type === 'ImportDeclaration')
            imports.push(node);
    });
    return imports;
}
const import_ = 'import';
const SEP = ':';
const zeroWidthSpace = '\u200b';
function serializeImportData({ importFilePath, importFileExportName, importWasGenerated }) {
    const tag = importWasGenerated ? zeroWidthSpace : '';
    // `import:${importFilePath}:${importFilePath}`
    return `${tag}${import_}${SEP}${importFilePath}${SEP}${importFileExportName}`;
}
function isImportData(str) {
    return str.startsWith(import_ + SEP) || str.startsWith(zeroWidthSpace + import_ + SEP);
}
function parseImportData(importDataString) {
    if (!isImportData(importDataString)) {
        return null;
    }
    let importWasGenerated = false;
    if (importDataString.startsWith(zeroWidthSpace)) {
        importWasGenerated = true;
        assert(zeroWidthSpace.length === 1);
        importDataString = importDataString.slice(1);
    }
    const parts = importDataString.split(SEP).slice(1);
    if (!importWasGenerated && parts.length === 1) {
        const importFileExportName = 'default';
        const importFilePath = parts[0];
        return { importFilePath, importFileExportName, importWasGenerated, importDataString };
    }
    assert(parts.length >= 2);
    const importFileExportName = parts[parts.length - 1];
    const importFilePath = parts.slice(0, -1).join(SEP);
    return { importFilePath, importFileExportName, importWasGenerated, importDataString };
}
function spliceMany(str, operations) {
    let strMod = '';
    let endPrev;
    operations.forEach(({ start, end, replacement }) => {
        if (endPrev !== undefined) {
            assert(endPrev < start);
        }
        else {
            endPrev = 0;
        }
        const replaced = str.slice(start, end);
        strMod +=
            str.slice(endPrev, start) +
                replacement +
                // Preserve number of lines for source map
                Array(replaced.split('\n').length - replacement.split('\n').length)
                    .fill('\n')
                    .join('');
        endPrev = end;
    });
    strMod += str.slice(endPrev, str.length - 1);
    return strMod;
}
function indent(str) {
    return str
        .split('\n')
        .map((s) => `  ${s}`)
        .join('\n');
}
