export { getVirtualFilePageConfigs };
import type { ConfigVpsResolved } from '../../../../../shared/ConfigVps.js';
declare function getVirtualFilePageConfigs(userRootDir: string, isForClientSide: boolean, isDev: boolean, id: string, configVps: ConfigVpsResolved, isClientRouting: boolean): Promise<string>;
