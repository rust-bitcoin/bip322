"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUrl = void 0;
const parseUrl_js_1 = require("./parseUrl.js");
const assert_js_1 = require("./assert.js");
function getCurrentUrl(options) {
    const url = window.location.href;
    const { searchOriginal, hashOriginal, pathname } = (0, parseUrl_js_1.parseUrl)(url, '/');
    let urlCurrent;
    if (options?.withoutHash) {
        urlCurrent = `${pathname}${searchOriginal || ''}`;
    }
    else {
        urlCurrent = `${pathname}${searchOriginal || ''}${hashOriginal || ''}`;
    }
    (0, assert_js_1.assert)(urlCurrent.startsWith('/'));
    return urlCurrent;
}
exports.getCurrentUrl = getCurrentUrl;
