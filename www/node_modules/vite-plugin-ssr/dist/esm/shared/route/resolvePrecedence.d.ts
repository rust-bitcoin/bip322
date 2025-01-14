export { resolvePrecendence };
import type { RouteType } from './loadPageRoutes.js';
type RouteMatch = {
    precedence?: number | null;
    routeString?: string;
    routeType: RouteType;
};
declare function resolvePrecendence<T extends RouteMatch>(routeMatches: T[]): void;
