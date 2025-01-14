export { getVirtualFileImportUserCode };
import type { ResolvedConfig } from 'vite';
import type { ConfigVpsResolved } from '../../../../shared/ConfigVps.js';
declare function getVirtualFileImportUserCode(id: string, options: {
    ssr?: boolean;
} | undefined, configVps: ConfigVpsResolved, config: ResolvedConfig, isDev: boolean): Promise<string>;
