export { isAlreadyPrefetched };
export { markAsAlreadyPrefetched };
import { parseUrl } from '../utils.js';
const linkAlreadyPrefetched = new Map();
function isAlreadyPrefetched(url) {
    const urlPathname = getUrlPathname(url);
    return linkAlreadyPrefetched.has(urlPathname);
}
function markAsAlreadyPrefetched(url) {
    const urlPathname = getUrlPathname(url);
    linkAlreadyPrefetched.set(urlPathname, true);
}
function getUrlPathname(url) {
    const urlPathname = parseUrl(url, '/').pathname;
    return urlPathname;
}
