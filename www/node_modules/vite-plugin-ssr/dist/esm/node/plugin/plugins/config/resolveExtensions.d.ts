export { resolveExtensions };
import type { ResolvedConfig } from 'vite';
import type { ConfigVpsUserProvided, ExtensionResolved } from '../../../../shared/ConfigVps.js';
declare function resolveExtensions(configs: ConfigVpsUserProvided[], config: ResolvedConfig): ExtensionResolved[];
