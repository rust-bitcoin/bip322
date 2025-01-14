export { getFilesystemRouteString };
export { getFilesystemRouteDefinedBy };
export { isInherited };
export { getLocationId };
export { sortAfterInheritanceOrder };
export { isGlobalLocation };
export { applyFilesystemRoutingRootEffect };
export { getLogicalPath };
/**
 * getLocationId('/pages/some-page/+Page.js') => '/pages/some-page'
 * getLocationId('/pages/some-page') => '/pages/some-page'
 * getLocationId('/renderer/+config.js') => '/renderer'
 */
declare function getLocationId(somePath: string): string;
/** Get URL determined by filesystem path */
declare function getFilesystemRouteString(locationId: string): string;
/**
 * getLogicalPath('/pages/some-page', ['pages']) => '/some-page'
 * getLogicalPath('some-npm-pkg/renderer', ['renderer']) => '/'
 */
declare function getLogicalPath(someDir: string, removeDirs: string[]): string;
/** Whether configs defined in `locationId` apply in every `locationIds` */
declare function isGlobalLocation(locationId: string, locationIds: string[]): boolean;
declare function sortAfterInheritanceOrder(locationId1: string, locationId2: string, locationIdPage: string): -1 | 1 | 0;
/** Whether configs defined at `locationId1` also apply at `locationId2` */
declare function isInherited(locationId1: string, locationId2: string): boolean;
declare function getFilesystemRouteDefinedBy(locationId: string): string;
declare function applyFilesystemRoutingRootEffect(routeFilesystem: string, filesystemRoutingRootEffect: {
    before: string;
    after: string;
}): string;
