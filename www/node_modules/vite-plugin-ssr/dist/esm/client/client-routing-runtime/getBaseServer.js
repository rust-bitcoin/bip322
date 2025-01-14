import { assert } from '../server-routing-runtime/utils.js';
export function getBaseServer() {
    // @ts-ignore Since dist/cjs/client/ is never used, we can ignore this error.
    const baseServer = import.meta.env.BASE_SERVER;
    assert(isBaseServer(baseServer));
    return baseServer;
}
// We don't use isBaseServer() defined in utils/parseUrl.ts to avoid loading the whole file in the browser
function isBaseServer(baseServer) {
    return baseServer.startsWith('/');
}
