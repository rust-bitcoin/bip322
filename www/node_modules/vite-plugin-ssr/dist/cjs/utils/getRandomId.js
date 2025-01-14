"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomId = void 0;
const assert_js_1 = require("./assert.js");
// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function getRandomId(length) {
    let randomId = '';
    while (randomId.length < length) {
        randomId += Math.random().toString(36).slice(2);
    }
    randomId = randomId.slice(0, length);
    (0, assert_js_1.assert)(/^[a-z0-9]+$/.test(randomId) && randomId.length === length);
    return randomId;
}
exports.getRandomId = getRandomId;
