export { getHook };
export { assertHook };
export { assertHookFn };
export type { Hook };
export type { HookName };
export type { HookLoc };
import { PageContextExports } from '../getPageFiles.js';
import type { HookName } from '../page-configs/Config.js';
type Hook = HookLoc & {
    hookFn: HookFn;
};
type HookLoc = {
    hookName: HookName;
    hookFilePath: string;
};
type HookFn = (arg: unknown) => unknown;
declare function getHook(pageContext: PageContextExports, hookName: HookName): null | Hook;
declare function assertHook<TPageContext extends PageContextExports, THookName extends PropertyKey & HookName>(pageContext: TPageContext, hookName: THookName): asserts pageContext is TPageContext & {
    exports: Record<THookName, Function | undefined>;
};
declare function assertHookFn(hookFn: unknown, { hookName, hookFilePath }: {
    hookName: HookName;
    hookFilePath: string;
}): asserts hookFn is HookFn;
