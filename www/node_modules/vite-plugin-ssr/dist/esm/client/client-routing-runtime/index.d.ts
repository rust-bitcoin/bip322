export { navigate, reload } from './navigate.js';
export { prefetch } from './prefetch.js';
import type { PageContextBuiltInClientWithClientRouting } from '../../shared/types.js';
/** @deprecated
 * Replace:
 *   ```
 *   import type { PageContextBuiltInClient } from 'vite-plugin/client/router'
 *   ```
 * With:
 *   ```
 *   import type {
 *     PageContextBuiltInClientWithClientRouting as
 *     PageContextBuiltInClient
 *   } from 'vite-plugin-ssr/types'
 *   ```
 */
type PageContextBuiltInClient<Page = any> = PageContextBuiltInClientWithClientRouting<Page>;
export type { PageContextBuiltInClient };
