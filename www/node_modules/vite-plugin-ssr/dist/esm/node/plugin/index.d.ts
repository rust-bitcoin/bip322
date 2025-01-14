export default plugin;
export { plugin };
export { plugin as ssr };
export type { ConfigVpsUserProvided as UserConfig };
import type { ConfigVpsUserProvided } from '../../shared/ConfigVps.js';
declare function plugin(vpsConfig?: ConfigVpsUserProvided): any;
