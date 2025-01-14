export { generateEagerImport };
declare function generateEagerImport(importPath: string, varCounter?: number, importName?: string): {
    importVar: string;
    importStatement: string;
};
