export { buildConfig };
export { assertRollupInput };
export { analyzeClientEntries };
import type { ResolvedConfig, Plugin } from 'vite';
import type { PageConfigBuildTime } from '../../../shared/page-configs/PageConfig.js';
declare function buildConfig(): Plugin;
declare function analyzeClientEntries(pageConfigs: PageConfigBuildTime[], config: ResolvedConfig): {
    hasClientRouting: boolean;
    hasServerRouting: boolean;
    clientEntries: Record<string, string>;
};
declare function assertRollupInput(config: ResolvedConfig): void;
