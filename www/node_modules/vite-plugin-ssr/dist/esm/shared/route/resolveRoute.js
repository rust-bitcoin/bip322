export { resolveRoute };
import { assertUsage } from './utils.js';
import { resolveRouteString } from './resolveRouteString.js';
import pc from '@brillout/picocolors';
function resolveRoute(routeString, urlPathname) {
    const errMsg = (propName, msg = 'a non-empty string') => `[resolveRoute(routeString, urlPathname)] ${pc.cyan(propName)} should be ` + msg;
    assertUsage(routeString, errMsg('routeString'), { showStackTrace: true });
    assertUsage(urlPathname, errMsg('urlPathname'), { showStackTrace: true });
    assertUsage(urlPathname.startsWith('/'), errMsg('urlPathname', 'pageContext.urlPathname'), { showStackTrace: true });
    const result = resolveRouteString(routeString, urlPathname);
    return {
        match: !!result,
        routeParams: result?.routeParams ?? {}
    };
}
