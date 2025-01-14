export { resolveBase };
export { resolveBaseFromUserConfig };
import type { ResolvedConfig, UserConfig } from 'vite';
import type { ConfigVpsUserProvided } from '../../../../shared/ConfigVps.js';
type BaseServers = {
    baseServer: string;
    baseAssets: string;
};
declare function resolveBase(configs: ConfigVpsUserProvided[], config: ResolvedConfig): BaseServers;
declare function resolveBaseFromUserConfig(config: UserConfig, configVps: undefined | ConfigVpsUserProvided): BaseServers;
