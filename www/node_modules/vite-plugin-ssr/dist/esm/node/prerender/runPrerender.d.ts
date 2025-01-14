export { prerenderFromAPI };
export { prerenderFromCLI };
export { prerenderFromAutoFullBuild };
export { prerenderForceExit };
export type { PrerenderOptions };
import '../runtime/page-files/setup.js';
import type { InlineConfig } from 'vite';
type PrerenderOptions = {
    /** Initial `pageContext` values */
    pageContextInit?: Record<string, unknown>;
    /**
     * The Vite config.
     *
     * This is optional and, if omitted, then Vite will automatically load your `vite.config.js`.
     *
     * We recommend to either omit this option or set it to `prerender({ viteConfig: { root }})`: the `vite.config.js` file living at `root` will be loaded.
     *
     * Alternatively you can:
     *  - Set `prerender({ viteConfig: { configFile: './path/to/vite.config.js' }})`.
     *  - Not load any `vite.config.js` file and, instead, use `prerender({ viteConfig: { configFile: false, ...myViteConfig }})` to programmatically define the entire Vite config.
     *
     * You can also load a `vite.config.js` file while overriding parts of the Vite config.
     *
     * See https://vitejs.dev/guide/api-javascript.html#inlineconfig for more information.
     *
     * @default { root: process.cwd() }
     *
     */
    viteConfig?: InlineConfig;
    /**
     * @internal
     * Don't use without having talked to a vite-plugin-ssr maintainer.
     */
    onPagePrerender?: Function;
    /** @deprecated Define `prerender({ viteConfig: { root }})` instead. */
    root?: string;
    /** @deprecated Define `prerender({ viteConfig: { configFile }})` instead. */
    configFile?: string;
    /** @deprecated Define `partial` in vite.config.js instead, see https://vite-plugin-ssr.com/prerender-config */
    partial?: boolean;
    /** @deprecated Define `noExtraDir` in vite.config.js instead, see https://vite-plugin-ssr.com/prerender-config */
    noExtraDir?: boolean;
    /** @deprecated Define `parallel` in vite.config.js instead, see https://vite-plugin-ssr.com/prerender-config */
    parallel?: number;
    /** @deprecated */
    outDir?: string;
    /** @deprecated */
    base?: string;
};
declare function prerenderFromAPI(options?: PrerenderOptions): Promise<void>;
declare function prerenderFromCLI(options: PrerenderOptions): Promise<void>;
declare function prerenderFromAutoFullBuild(options: PrerenderOptions): Promise<void>;
declare function prerenderForceExit(): void;
