export { getCurrentUrl };
import { parseUrl } from './parseUrl.js';
import { assert } from './assert.js';
function getCurrentUrl(options) {
    const url = window.location.href;
    const { searchOriginal, hashOriginal, pathname } = parseUrl(url, '/');
    let urlCurrent;
    if (options?.withoutHash) {
        urlCurrent = `${pathname}${searchOriginal || ''}`;
    }
    else {
        urlCurrent = `${pathname}${searchOriginal || ''}${hashOriginal || ''}`;
    }
    assert(urlCurrent.startsWith('/'));
    return urlCurrent;
}
