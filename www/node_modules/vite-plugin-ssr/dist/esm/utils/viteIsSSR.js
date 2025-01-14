import { assert } from './assert.js';
import { isObject } from './isObject.js';
export { viteIsSSR };
export { viteIsSSR_options };
function viteIsSSR(config) {
    return !!config?.build?.ssr;
}
// https://github.com/vitejs/vite/discussions/5109#discussioncomment-1450726
function viteIsSSR_options(options) {
    if (options === undefined) {
        return false;
    }
    if (typeof options === 'boolean') {
        return options;
    }
    if (isObject(options)) {
        return !!options.ssr;
    }
    assert(false);
}
