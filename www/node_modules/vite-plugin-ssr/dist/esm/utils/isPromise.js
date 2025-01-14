import { isCallable } from './isCallable.js';
export function isPromise(val) {
    return typeof val === 'object' && val !== null && 'then' in val && isCallable(val.then);
}
