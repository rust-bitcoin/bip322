export { determineFsAllowList };
import type { ResolvedConfig } from 'vite';
import type { ConfigVpsResolved } from '../../../../shared/ConfigVps.js';
declare function determineFsAllowList(config: ResolvedConfig, configVps: ConfigVpsResolved): Promise<void>;
