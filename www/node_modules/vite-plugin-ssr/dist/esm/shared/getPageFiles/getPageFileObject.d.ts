export { getPageFileObject };
export type { PageFile };
import { FileType } from './fileTypes.js';
type PageFile = {
    filePath: string;
    fileType: FileType;
    isEnv: (env: 'CLIENT_ONLY' | 'SERVER_ONLY' | 'CLIENT_AND_SERVER') => boolean;
    fileExports?: Record<string, unknown>;
    loadFile?: () => Promise<void>;
    exportNames?: string[];
    loadExportNames?: () => Promise<void>;
    isRelevant: (pageId: string) => boolean;
    isDefaultPageFile: boolean;
    isRendererPageFile: boolean;
    isErrorPageFile: boolean;
    pageId: string;
};
declare function getPageFileObject(filePath: string): PageFile;
