"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reload = exports.navigate = void 0;
const assert_js_1 = require("../../utils/assert.js");
// `never` to ensure package.json#exports["./client/router"].types points to type defined by the client-side code
const navigate = (() => warnNoEffect('navigate'));
exports.navigate = navigate;
const reload = (() => warnNoEffect('reload'));
exports.reload = reload;
function warnNoEffect(caller) {
    (0, assert_js_1.assertWarning)(false, `Calling ${caller} on the server-side has no effect`, {
        showStackTrace: true,
        onlyOnce: false
    });
}
