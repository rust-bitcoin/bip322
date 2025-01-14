export { getConfigValue };
export { getPageConfig };
export { getConfigDefinedAtString };
export { getConfigDefinedAtInfo };
export { getDefinedAtString };
import type { DefinedAtInfo, PageConfig, PageConfigCommon } from './PageConfig.js';
import type { ConfigNameBuiltIn } from './Config.js';
type ConfigName = ConfigNameBuiltIn;
declare function getConfigValue(pageConfig: PageConfigCommon, configName: ConfigName, type: 'string'): null | {
    value: string;
};
declare function getConfigValue(pageConfig: PageConfigCommon, configName: ConfigName, type: 'boolean'): null | {
    value: boolean;
};
declare function getConfigValue(pageConfig: PageConfigCommon, configName: ConfigName): null | {
    value: unknown;
};
declare function getConfigDefinedAtInfo(pageConfig: PageConfigCommon, configName: ConfigName): DefinedAtInfo;
declare function getPageConfig(pageId: string, pageConfigs: PageConfig[]): PageConfig;
type ConfigDefinedAtUppercase<ConfigName extends string> = `Config ${ConfigName}${string}`;
type ConfigDefinedAtLowercase<ConfigName extends string> = `config ${ConfigName}${string}`;
declare function getConfigDefinedAtString<ConfigName extends string>(configName: ConfigName, { definedAtInfo }: {
    definedAtInfo: null | DefinedAtInfo;
}, sentenceBegin: true, append?: 'effect'): ConfigDefinedAtUppercase<ConfigName>;
declare function getConfigDefinedAtString<ConfigName extends string>(configName: ConfigName, { definedAtInfo }: {
    definedAtInfo: null | DefinedAtInfo;
}, sentenceBegin: false, append?: 'effect'): ConfigDefinedAtLowercase<ConfigName>;
declare function getDefinedAtString(definedAtInfo: DefinedAtInfo, append?: 'effect'): string;
