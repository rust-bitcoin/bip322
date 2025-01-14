export { getOutDirs };
export { getOutDirs_prerender };
export { resolveOutDir };
import type { UserConfig, ResolvedConfig } from 'vite';
type OutDirs = {
    /** Absolute path to `outDir` */
    outDirRoot: string;
    /** Absolute path to `${outDir}/client` */
    outDirClient: string;
    /** Absolute path to `${outDir}/server` */
    outDirServer: string;
};
declare function getOutDirs(config: ResolvedConfig): OutDirs;
declare function getOutDirs_prerender(config: ResolvedConfig): OutDirs;
/** Appends `client/` or `server/` to `config.build.outDir` */
declare function resolveOutDir(config: UserConfig): string;
