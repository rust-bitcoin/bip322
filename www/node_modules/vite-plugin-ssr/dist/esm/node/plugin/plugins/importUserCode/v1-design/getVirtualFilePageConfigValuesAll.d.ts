export { getVirtualFilePageConfigValuesAll };
import type { ConfigVpsResolved } from '../../../../../shared/ConfigVps.js';
declare function getVirtualFilePageConfigValuesAll(id: string, userRootDir: string, isDev: boolean, configVps: ConfigVpsResolved): Promise<string>;
