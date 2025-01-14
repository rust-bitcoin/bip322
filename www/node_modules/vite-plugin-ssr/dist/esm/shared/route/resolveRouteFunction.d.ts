export { resolveRouteFunction };
export { assertRouteParams };
export { assertSyncRouting };
export { warnDeprecatedAllowKey };
import { PageContextUrlComputedPropsInternal } from '../addUrlComputedProps.js';
declare function resolveRouteFunction(routeFunction: Function, pageContext: PageContextUrlComputedPropsInternal, routeDefinedAt: string): Promise<null | {
    precedence: number | null;
    routeParams: Record<string, string>;
}>;
declare function assertSyncRouting(res: unknown, errPrefix: string): void;
declare function warnDeprecatedAllowKey(): void;
declare function assertRouteParams<T>(result: T, errPrefix: string): asserts result is T & {
    routeParams?: Record<string, string>;
};
