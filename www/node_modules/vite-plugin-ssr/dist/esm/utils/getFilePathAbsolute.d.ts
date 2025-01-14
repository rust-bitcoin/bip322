export { getFilePathAbsolute };
export { getFilePathVite };
import type { ResolvedConfig } from 'vite';
declare function getFilePathAbsolute(filePath: string, config: ResolvedConfig): string;
declare function getFilePathVite(filePath: string, userRootDir: string, alwaysRelativeToRoot?: boolean): string;
