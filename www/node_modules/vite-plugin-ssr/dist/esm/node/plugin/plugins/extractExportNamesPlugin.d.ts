export { extractExportNamesPlugin };
export { isUsingClientRouter };
export { extractExportNamesRE };
import type { Plugin } from 'vite';
declare const extractExportNamesRE: RegExp;
declare function extractExportNamesPlugin(): Plugin;
declare function isUsingClientRouter(): boolean;
