export { configDefinitionsBuiltIn };
export { configDefinitionsBuiltInGlobal };
export type { ConfigDefinition };
export type { ConfigDefinitionInternal };
export type { ConfigNameGlobal };
export type { ConfigEffect };
import type { ConfigEnvInternal, ConfigEnv, PageConfigBuildTime } from '../../../../../../shared/page-configs/PageConfig.js';
import type { Config, ConfigNameBuiltIn } from '../../../../../../shared/page-configs/Config.js';
/** The meta definition of a config.
 *
 * https://vite-plugin-ssr.com/meta
 */
type ConfigDefinition = {
    /** In what environment(s) the config value is loaded.
     *
     * https://vite-plugin-ssr.com/meta
     */
    env: ConfigEnv;
    /** Disable config overriding and make config values cumulative instead.
     *
     * @default false
     *
     * https://vite-plugin-ssr.com/meta
     */
    cumulative?: boolean;
    /**
     * Define a so-called "Shortcut Config".
     *
     * https://vite-plugin-ssr.com/meta
     */
    effect?: ConfigEffect;
};
type ConfigEffect = (config: {
    /** The resolved config value.
     *
     * https://vite-plugin-ssr.com/meta
     */
    configValue: unknown;
    /** Place where the resolved config value comes from.
     *
     * https://vite-plugin-ssr.com/meta
     */
    configDefinedAt: `Config ${string}`;
}) => Config | undefined;
type ConfigDefinitionInternal = Omit<ConfigDefinition, 'env'> & {
    _computed?: (pageConfig: PageConfigBuildTime) => unknown;
    _valueIsFilePath?: true;
    env: ConfigEnvInternal;
};
type ConfigDefinitionsBuiltIn = Record<ConfigNameBuiltIn, ConfigDefinitionInternal>;
declare const configDefinitionsBuiltIn: ConfigDefinitionsBuiltIn;
type ConfigNameGlobal = 'onPrerenderStart' | 'onBeforeRoute' | 'prerender' | 'extensions' | 'disableAutoFullBuild' | 'includeAssetsImportedByServer' | 'baseAssets' | 'baseServer' | 'redirects' | 'trailingSlash' | 'disableUrlNormalization';
declare const configDefinitionsBuiltInGlobal: Record<ConfigNameGlobal, ConfigDefinitionInternal>;
