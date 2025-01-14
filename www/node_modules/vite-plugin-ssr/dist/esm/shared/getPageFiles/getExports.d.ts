export { getExportUnion };
export { getExports };
export type { ExportsAll };
export type { PageContextExports };
export type { ConfigEntries };
import type { FileType } from './fileTypes.js';
import type { PageConfigLoaded } from './../page-configs/PageConfig.js';
import type { PageFile } from './getPageFileObject.js';
type ExportsAll = Record<string, {
    exportValue: unknown;
    exportSource: string;
    /** @deprecated */
    _fileType: FileType | null;
    /** @deprecated */
    _isFromDefaultExport: boolean | null;
    /** @deprecated */
    filePath: string | null;
    /** @deprecated */
    _filePath: string | null;
}[]>;
/** All the config's values (including overriden ones) and where they come from.
 *
 * https://vite-plugin-ssr.com/pageContext
 */
type ConfigEntries = Record<string, {
    configValue: unknown;
    configDefinedAt: string;
    configDefinedByFile: string | null;
}[]>;
type PageContextExports = {
    config: Record<string, unknown>;
    configEntries: ConfigEntries;
    exports: Record<string, unknown>;
    exportsAll: ExportsAll;
    /** @deprecated */
    pageExports: Record<string, unknown>;
};
declare function getExports(pageFiles: PageFile[], pageConfig: PageConfigLoaded | null): PageContextExports;
declare function getExportUnion(exportsAll: ExportsAll, propName: string): string[];
