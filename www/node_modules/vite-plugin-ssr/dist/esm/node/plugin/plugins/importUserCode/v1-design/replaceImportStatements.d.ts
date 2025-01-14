export { replaceImportStatements };
export { parseImportData };
export { isImportData };
export type { FileImport };
export type { ImportData };
type FileImport = {
    importStatementCode: string;
    importDataString: string;
    importLocalName: string;
};
declare function replaceImportStatements(code: string, filePathToShowToUser: string): {
    noImportStatement: true;
} | {
    noImportStatement: false;
    code: string;
    fileImports: FileImport[];
};
type ImportData = {
    importFilePath: string;
    importFileExportName: string;
    importWasGenerated: boolean;
    importDataString: string;
};
declare function isImportData(str: string): boolean;
declare function parseImportData(importDataString: string): null | ImportData;
declare module 'estree' {
    interface BaseNodeWithoutComments {
        start: number;
        end: number;
    }
}
