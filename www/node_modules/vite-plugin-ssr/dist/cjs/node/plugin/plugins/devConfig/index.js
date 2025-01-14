"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devConfig = void 0;
const determineOptimizeDeps_js_1 = require("./determineOptimizeDeps.js");
const determineFsAllowList_js_1 = require("./determineFsAllowList.js");
const getConfigVps_js_1 = require("../../../shared/getConfigVps.js");
const addSsrMiddleware_js_1 = require("../../shared/addSsrMiddleware.js");
const utils_js_1 = require("../../utils.js");
const loggerVite_js_1 = require("../../shared/loggerVite.js");
const isErrorDebug_js_1 = require("../../shared/isErrorDebug.js");
const getHttpRequestAsyncStore_js_1 = require("../../shared/getHttpRequestAsyncStore.js");
if ((0, isErrorDebug_js_1.isErrorDebug)()) {
    Error.stackTraceLimit = Infinity;
}
// There doesn't seem to be a straightforward way to discriminate between `$ vite preview` and `$ vite dev`
const apply = 'serve';
const isDev = true;
function devConfig() {
    let config;
    return [
        {
            name: 'vite-plugin-ssr:devConfig',
            apply,
            config() {
                return {
                    optimizeDeps: {
                        exclude: [
                            // We exclude the vite-plugin-ssr client to be able to use `import.meta.glob()`
                            'vite-plugin-ssr/client',
                            'vite-plugin-ssr/client/router',
                            'vite-plugin-ssr/routing',
                            // - We also exclude @brillout/json-serializer and @brillout/picocolors to avoid:
                            //   ```
                            //   9:28:58 AM [vite] ✨ new dependencies optimized: @brillout/json-serializer/parse
                            //   9:28:58 AM [vite] ✨ optimized dependencies changed. reloading
                            //   ```
                            // - Previously, we had to exclude @brillout/json-serializer and @brillout/picocolors because of pnpm, but this doesn't seem to be the case anymore.
                            //   - Actually, this should be still the case? How can Vite resolve @brillout/json-serializer when using pnpm?
                            '@brillout/json-serializer/parse',
                            '@brillout/json-serializer/stringify',
                            '@brillout/picocolors'
                        ]
                    }
                };
            },
            async configResolved(config_) {
                config = config_;
                const configVps = await (0, getConfigVps_js_1.getConfigVps)(config);
                await (0, determineOptimizeDeps_js_1.determineOptimizeDeps)(config, configVps, isDev);
                await (0, determineFsAllowList_js_1.determineFsAllowList)(config, configVps);
                if (!(0, isErrorDebug_js_1.isErrorDebug)()) {
                    await (0, getHttpRequestAsyncStore_js_1.installHttpRequestAsyncStore)();
                    (0, loggerVite_js_1.improveViteLogs)(config);
                }
            },
            configureServer() {
                (0, utils_js_1.markEnvAsDev)();
            }
        },
        {
            name: 'vite-plugin-ssr:devConfig:addSsrMiddleware',
            apply,
            // The SSR middleware should be last middleware
            enforce: 'post',
            configureServer: {
                order: 'post',
                handler(server) {
                    if (config.server.middlewareMode)
                        return;
                    return () => {
                        (0, addSsrMiddleware_js_1.addSsrMiddleware)(server.middlewares);
                    };
                }
            },
            // Setting `configResolved.clearScreen = false` doesn't work
            config: {
                order: 'post',
                handler() {
                    if ((0, isErrorDebug_js_1.isErrorDebug)()) {
                        return { clearScreen: false };
                    }
                }
            }
        }
    ];
}
exports.devConfig = devConfig;
