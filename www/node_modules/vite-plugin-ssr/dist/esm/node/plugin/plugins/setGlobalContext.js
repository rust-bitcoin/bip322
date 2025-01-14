export { setGlobalContext };
import { setGlobalContext_viteDevServer, setGlobalContext_vitePreviewServer, setGlobalContext_viteConfig } from '../../runtime/globalContext.js';
function setGlobalContext() {
    return {
        name: 'vite-plugin-ssr:setGlobalContext',
        enforce: 'pre',
        configureServer: {
            order: 'pre',
            handler(viteDevServer) {
                setGlobalContext_viteDevServer(viteDevServer);
            }
        },
        configurePreviewServer: {
            order: 'pre',
            handler(vitePreviewServer) {
                setGlobalContext_vitePreviewServer(
                // Type cast won't be necessary after https://github.com/vitejs/vite/pull/14119 is released in Vite 5
                vitePreviewServer);
            }
        },
        configResolved: {
            order: 'pre',
            handler(config) {
                setGlobalContext_viteConfig(config);
            }
        }
    };
}
