import { route, type PageRoutes } from '../shared/route/index.js';
import { type PageFile } from '../shared/getPageFiles.js';
import { PageConfig } from '../shared/page-configs/PageConfig.js';
export { route, getPagesAndRoutes };
export type { PageRoutes, PageFile, PageConfig };
/**
 * Used by {@link https://github.com/magne4000/vite-plugin-vercel|vite-plugin-vercel}
 * to compute some rewrite rules and extract { isr } configs.
 * Needs `import 'vite-plugin-ssr/__internal/setup'`
 * @param config
 */
declare function getPagesAndRoutes(): Promise<{
    pageRoutes: PageRoutes;
    pageFilesAll: PageFile[];
    pageConfigs: PageConfig[];
    allPageIds: string[];
}>;
