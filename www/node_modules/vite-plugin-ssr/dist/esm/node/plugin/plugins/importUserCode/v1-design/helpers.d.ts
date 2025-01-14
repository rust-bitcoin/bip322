export { getConfigEnv };
export { isConfigSet };
import type { ConfigEnvInternal, PageConfigBuildTime } from '../../../../../shared/page-configs/PageConfig.js';
declare function getConfigEnv(pageConfig: PageConfigBuildTime, configName: string): null | ConfigEnvInternal;
declare function isConfigSet(pageConfig: PageConfigBuildTime, configName: string): boolean;
