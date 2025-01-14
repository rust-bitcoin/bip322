export { findPageFiles };
import type { ResolvedConfig } from 'vite';
import type { FileType } from '../../../shared/getPageFiles/fileTypes.js';
declare function findPageFiles(config: ResolvedConfig, fileTypes: FileType[], isDev: boolean): Promise<string[]>;
