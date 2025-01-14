"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttle = void 0;
function throttle(func, waitTime) {
    let isQueued = false;
    return () => {
        if (!isQueued) {
            isQueued = true;
            setTimeout(() => {
                isQueued = false;
                func();
            }, waitTime);
        }
    };
}
exports.throttle = throttle;
