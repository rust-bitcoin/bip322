export { initGlobalContext };
export { getGlobalContext };
export { getViteDevServer };
export { getViteConfig };
export { setGlobalContext_viteDevServer };
export { setGlobalContext_vitePreviewServer };
export { setGlobalContext_viteConfig };
export { getRuntimeManifest };
import type { ViteManifest } from '../shared/ViteManifest.js';
import type { ResolvedConfig, ViteDevServer, PreviewServer as VitePreviewServer } from 'vite';
import { PluginManifest } from '../shared/assertPluginManifest.js';
import type { ConfigVpsResolved } from '../../shared/ConfigVps.js';
import { type RuntimeManifest } from '../shared/assertRuntimeManifest.js';
type GlobalContext = {
    baseServer: string;
    baseAssets: null | string;
    includeAssetsImportedByServer: boolean;
    redirects: Record<string, string>;
    trailingSlash: boolean;
    disableUrlNormalization: boolean;
} & ({
    isProduction: false;
    isPrerendering: false;
    viteConfig: ResolvedConfig;
    configVps: ConfigVpsResolved;
    viteDevServer: ViteDevServer;
    vitePreviewServer: null;
    clientManifest: null;
    pluginManifest: null;
} | ({
    isProduction: true;
    clientManifest: ViteManifest;
    pluginManifest: PluginManifest;
    viteDevServer: null;
    vitePreviewServer: null | VitePreviewServer;
} & ({
    isPrerendering: false;
    viteConfig: null;
    configVps: null;
} | {
    isPrerendering: true;
    viteConfig: ResolvedConfig;
    configVps: ConfigVpsResolved;
})));
declare function getGlobalContext(): GlobalContext;
declare function setGlobalContext_viteDevServer(viteDevServer: ViteDevServer): void;
declare function setGlobalContext_vitePreviewServer(vitePreviewServer: VitePreviewServer): void;
declare function getViteDevServer(): ViteDevServer | null;
declare function setGlobalContext_viteConfig(viteConfig: ResolvedConfig): void;
declare function getViteConfig(): ResolvedConfig | null;
declare function initGlobalContext(isPrerendering?: boolean, outDir?: string): Promise<void>;
declare function getRuntimeManifest(configVps: ConfigVpsResolved): RuntimeManifest;
