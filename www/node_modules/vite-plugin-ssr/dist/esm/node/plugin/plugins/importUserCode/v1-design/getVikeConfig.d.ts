export { getVikeConfig };
export { reloadVikeConfig };
export { vikeConfigDependencies };
export { isVikeConfigFile };
import type { PageConfigGlobalData, PageConfigBuildTime } from '../../../../../shared/page-configs/PageConfig.js';
import type { ExtensionResolved } from '../../../../../shared/ConfigVps.js';
type VikeConfig = {
    pageConfigs: PageConfigBuildTime[];
    pageConfigGlobal: PageConfigGlobalData;
    globalVikeConfig: Record<string, unknown>;
};
declare const vikeConfigDependencies: Set<string>;
declare function reloadVikeConfig(userRootDir: string, extensions: ExtensionResolved[]): void;
declare function getVikeConfig(userRootDir: string, isDev: boolean, extensions: ExtensionResolved[], tolerateInvalidConfig?: boolean): Promise<VikeConfig>;
declare function isVikeConfigFile(filePath: string): boolean;
