export { findBuildEntry };
export type { RollupBundle };
import type { ResolvedConfig } from 'vite';
declare type RollupBundle = Record<string, unknown>;
declare function findBuildEntry(entryName: string, rollupBundle: RollupBundle, config: ResolvedConfig): string;
