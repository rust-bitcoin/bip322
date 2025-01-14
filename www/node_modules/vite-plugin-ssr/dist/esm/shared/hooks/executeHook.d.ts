export { executeHook };
export { isUserHookError };
import type { HookLoc, HookName } from './getHook.js';
declare function isUserHookError(err: unknown): false | HookLoc;
declare function executeHook<T = unknown>(hookFn: () => T, hookName: HookName, hookFilePath: string): Promise<T>;
