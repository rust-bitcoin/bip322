export { assertPageConfigs };
export { assertPageConfigGlobal };
import type { PageConfig, PageConfigGlobal } from '../page-configs/PageConfig.js';
declare function assertPageConfigs(pageConfigs: unknown): asserts pageConfigs is PageConfig[];
declare function assertPageConfigGlobal(pageConfigGlobal: unknown): asserts pageConfigGlobal is PageConfigGlobal;
