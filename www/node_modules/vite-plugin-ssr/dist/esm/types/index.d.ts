export type { PageContext } from '../shared/types.js';
export type { PageContextServer } from '../shared/types.js';
export type { PageContextClient } from '../shared/types.js';
export type { PageContextWithServerRouting } from '../shared/types.js';
export type { PageContextClientWithServerRouting } from '../shared/types.js';
export type { PageContextBuiltInServer } from '../shared/types.js';
export type { PageContextBuiltInClientWithClientRouting } from '../shared/types.js';
export type { PageContextBuiltInClientWithServerRouting } from '../shared/types.js';
export type { Config, ConfigMeta as Meta } from '../shared/page-configs/Config.js';
export type { ConfigEnv } from '../shared/page-configs/PageConfig.js';
export type { ConfigDefinition, ConfigEffect } from '../node/plugin/plugins/importUserCode/v1-design/getVikeConfig/configDefinitionsBuiltIn.js';
export type { ConfigEntries } from '../shared/getPageFiles/getExports.js';
export type { InjectFilterEntry } from '../node/runtime/html/injectAssets/getHtmlTags.js';
import type { ConfigEnv } from '../shared/page-configs/PageConfig.js';
/** @deprecated Replace:
 *   `import type { Env } from 'vite-plugin-ssr/types'`
 * With:
 *   `import type { ConfigEnv } from 'vite-plugin-ssr/types'`
 */
type Env = ConfigEnv;
export type { Env };
import type { ConfigEffect } from '../node/plugin/plugins/importUserCode/v1-design/getVikeConfig/configDefinitionsBuiltIn.js';
/** @deprecated Replace:
 *   `import type { Effect } from 'vite-plugin-ssr/types'`
 * With:
 *   `import type { ConfigEffect } from 'vite-plugin-ssr/types'`
 */
type Effect = ConfigEffect;
export type { Effect };
import { PageContextBuiltInClientWithServerRouting } from '../shared/types.js';
/** @deprecated Replace:
 *   `import type { PageContextBuiltInClient } from 'vite-plugin-ssr/types'`
 * With:
 *   `import type { PageContextBuiltInClientWithServerRouting } from 'vite-plugin-ssr/types'`
 * Or:
 *   `import type { PageContextBuiltInClientWithClientRouting } from 'vite-plugin-ssr/types'`
 */
type PageContextBuiltInClient<Page = any> = PageContextBuiltInClientWithServerRouting<Page>;
export type { PageContextBuiltInClient };
import { PageContextBuiltInServer } from '../shared/types.js';
/** @deprecated Replace:
 *   `import type { PageContextBuiltIn } from 'vite-plugin-ssr/types'`
 * With:
 *   `import type { PageContextBuiltInServer } from 'vite-plugin-ssr/types'`
 */
type PageContextBuiltIn<Page = any> = PageContextBuiltInServer<Page>;
export type { PageContextBuiltIn };
