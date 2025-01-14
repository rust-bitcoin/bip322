import { renderPage } from './runtime/renderPage.js';
export { createPageRenderer };
type RenderPage = typeof renderPage;
type Options = {
    viteDevServer?: unknown;
    root?: string;
    outDir?: string;
    isProduction?: boolean;
    base?: string;
    baseAssets?: string | null;
};
/** @deprecated */
declare function createPageRenderer(options: Options): RenderPage;
