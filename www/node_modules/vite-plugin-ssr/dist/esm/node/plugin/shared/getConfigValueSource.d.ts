export { getConfigValueSource };
export { getConfigValueSourcesRelevant };
import type { ConfigValueSource, PageConfigBuildTime } from '../../../shared/page-configs/PageConfig.js';
declare function getConfigValueSource(pageConfig: PageConfigBuildTime, configName: string): null | ConfigValueSource;
declare function getConfigValueSourcesRelevant(pageConfig: PageConfigBuildTime): (ConfigValueSource & {
    configName: string;
})[];
