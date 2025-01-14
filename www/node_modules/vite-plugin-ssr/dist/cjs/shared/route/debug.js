"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = void 0;
var _debug;
function debug(...args) {
    if (!_debug) {
        // We use this trick instead of `import { createDebugger } from '../../utils/debug` in order to ensure that the `debug` mechanism is only loaded on the server-side
        _debug = globalThis.__brillout_debug_createDebugger?.('vps:routing');
    }
    if (_debug) {
        _debug(...args);
    }
}
exports.debug = debug;
