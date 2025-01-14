export { getExportNames };
export { getImportStatements };
export type { ImportStatement };
import { parse } from 'es-module-lexer';
type ParseResult = ReturnType<typeof parse>;
type ImportStatement = ParseResult[0][0];
declare function getExportNames(src: string): Promise<{
    exportNames: string[];
    wildcardReExports: string[];
}>;
declare function getImportStatements(src: string): Promise<ImportStatement[]>;
