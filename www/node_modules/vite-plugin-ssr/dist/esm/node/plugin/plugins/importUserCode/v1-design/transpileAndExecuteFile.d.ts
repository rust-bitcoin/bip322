export { transpileAndExecuteFile };
export { getConfigBuildErrorFormatted };
export { getConfigExececutionErrorIntroMsg };
export { isTmpFile };
import 'source-map-support/register.js';
import { type FilePath } from './getFilePathToShowToUser.js';
declare function transpileAndExecuteFile(filePath: FilePath, isValueFile: boolean, userRootDir: string): Promise<{
    fileExports: Record<string, unknown>;
}>;
declare function getConfigBuildErrorFormatted(err: unknown): null | string;
declare function getConfigExececutionErrorIntroMsg(err: unknown): string | null;
declare function isTmpFile(filePath: string): boolean;
