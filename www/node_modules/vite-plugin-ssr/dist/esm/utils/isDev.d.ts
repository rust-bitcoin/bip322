export { isDev1 };
export { isDev1_onConfigureServer };
export { isDev2 };
declare function isDev1(): boolean;
declare function isDev1_onConfigureServer(): void | undefined;
import type { ResolvedConfig } from 'vite';
declare function isDev2(config: ResolvedConfig): boolean;
