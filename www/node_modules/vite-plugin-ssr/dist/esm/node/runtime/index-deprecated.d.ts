export * from './index-common.js';
export * from '../../types/index-dreprecated.js';
/** @deprecated
 * Replace:
 *   ```
 *   import { RenderErrorPage } from 'vite-plugin-ssr'
 *   ```
 * With:
 *   ```
 *   import { render } from 'vite-plugin-ssr/abort'
 *   ```
 *
 * See https://vite-plugin-ssr.com/render
 */
export declare const RenderErrorPage: (args_0?: {
    pageContext?: Record<string, unknown> | undefined;
} | undefined) => Error;
