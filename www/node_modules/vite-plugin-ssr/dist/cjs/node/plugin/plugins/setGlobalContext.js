"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGlobalContext = void 0;
const globalContext_js_1 = require("../../runtime/globalContext.js");
function setGlobalContext() {
    return {
        name: 'vite-plugin-ssr:setGlobalContext',
        enforce: 'pre',
        configureServer: {
            order: 'pre',
            handler(viteDevServer) {
                (0, globalContext_js_1.setGlobalContext_viteDevServer)(viteDevServer);
            }
        },
        configurePreviewServer: {
            order: 'pre',
            handler(vitePreviewServer) {
                (0, globalContext_js_1.setGlobalContext_vitePreviewServer)(
                // Type cast won't be necessary after https://github.com/vitejs/vite/pull/14119 is released in Vite 5
                vitePreviewServer);
            }
        },
        configResolved: {
            order: 'pre',
            handler(config) {
                (0, globalContext_js_1.setGlobalContext_viteConfig)(config);
            }
        }
    };
}
exports.setGlobalContext = setGlobalContext;
