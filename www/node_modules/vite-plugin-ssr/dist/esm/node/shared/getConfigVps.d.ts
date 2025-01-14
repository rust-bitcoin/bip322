export { getConfigVps };
import type { ConfigVpsResolved } from '../../shared/ConfigVps.js';
declare function getConfigVps(config: Record<string, unknown>): Promise<ConfigVpsResolved>;
