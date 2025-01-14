"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseUrls = void 0;
const resolveBase_js_1 = require("../plugins/config/resolveBase.js");
const utils_js_1 = require("../utils.js");
const getConfigVps_js_1 = require("../../shared/getConfigVps.js");
function baseUrls(configVps) {
    let baseServer;
    let baseAssets;
    return {
        name: 'vite-plugin-ssr:baseUrls',
        enforce: 'post',
        config: (config) => {
            const bases = (0, resolveBase_js_1.resolveBaseFromUserConfig)(config, configVps);
            baseServer = bases.baseServer;
            baseAssets = bases.baseAssets;
            // We cannot define these in configResolved() because Vite picks up the env variables before any configResolved() hook is called
            process.env.BASE_SERVER = baseServer;
            process.env.BASE_ASSETS = baseAssets;
            return {
                envPrefix: [
                    'VITE_',
                    'BASE_SERVER',
                    'BASE_ASSETS'
                ],
                base: baseAssets,
                _baseOriginal: config.base ?? '/__UNSET__' // Vite resolves `_baseOriginal: null` to `undefined`
            };
        },
        async configResolved(config) {
            const configVps = await (0, getConfigVps_js_1.getConfigVps)(config);
            // Ensure that the premature base URL resolving we did in config() isn't erroneous
            (0, utils_js_1.assert)(configVps.baseServer === baseServer);
            (0, utils_js_1.assert)(configVps.baseAssets === baseAssets);
            /* In dev, Vite seems buggy around setting vite.config.js#base to an absolute URL (e.g. http://localhost:8080/cdn/)
             *  - In dev, Vite removes the URL origin. (I.e. it resolves the user config `vite.config.js#base: 'http://localhost:8080/cdn/'` to resolved config `config.base === '/cdn/'`.)
             *  - Instead of having an internal VPS assertion fail, we let the user discover Vite's buggy behavior.
            assert(config.base === baseAssets)
            */
        }
    };
}
exports.baseUrls = baseUrls;
