export { assertDefaultExports };
export { assertExportValues };
export { forbiddenDefaultExports };
import type { PageFile } from './getPageFileObject.js';
declare function assertExportValues(pageFile: PageFile): void;
declare const forbiddenDefaultExports: string[];
declare function assertDefaultExports(defaultExportName: string, filePath: string): void;
