"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRetry = void 0;
const sleep_js_1 = require("./sleep.js");
async function autoRetry(fn, timeout) {
    const interval = 30;
    const numberOfTries = timeout / interval;
    let i = 0;
    while (true) {
        try {
            await fn();
            return;
        }
        catch (err) {
            i = i + 1;
            if (i > numberOfTries) {
                throw err;
            }
        }
        await (0, sleep_js_1.sleep)(interval);
    }
}
exports.autoRetry = autoRetry;
