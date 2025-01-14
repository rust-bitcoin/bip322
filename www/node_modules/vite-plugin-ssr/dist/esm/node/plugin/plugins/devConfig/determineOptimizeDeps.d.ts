export { determineOptimizeDeps };
import type { ResolvedConfig } from 'vite';
import { ConfigVpsResolved } from '../../../../shared/ConfigVps.js';
declare function determineOptimizeDeps(config: ResolvedConfig, configVps: ConfigVpsResolved, isDev: true): Promise<void>;
