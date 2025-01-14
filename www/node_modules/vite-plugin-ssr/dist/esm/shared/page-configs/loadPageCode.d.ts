export { loadPageCode };
import type { PageConfig, PageConfigLoaded } from './PageConfig.js';
declare function loadPageCode(pageConfig: PageConfig, isDev: boolean): Promise<PageConfigLoaded>;
