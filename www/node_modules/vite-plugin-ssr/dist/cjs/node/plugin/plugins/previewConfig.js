"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewConfig = void 0;
const utils_js_1 = require("../utils.js");
const getConfigVps_js_1 = require("../../shared/getConfigVps.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const addSsrMiddleware_js_1 = require("../shared/addSsrMiddleware.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function previewConfig() {
    let config;
    let configVps;
    return {
        name: 'vite-plugin-ssr:previewConfig',
        apply: 'serve',
        config(config) {
            return {
                build: {
                    outDir: (0, utils_js_1.resolveOutDir)(config)
                }
            };
        },
        async configResolved(config_) {
            config = config_;
            configVps = await (0, getConfigVps_js_1.getConfigVps)(config);
        },
        configurePreviewServer(server) {
            (0, utils_js_1.markEnvAsPreview)();
            return () => {
                assertDist();
                if (!configVps.prerender) {
                    (0, addSsrMiddleware_js_1.addSsrMiddleware)(server.middlewares);
                }
                addStatic404Middleware(server.middlewares);
            };
        }
    };
    function assertDist() {
        let { outDirRoot, outDirClient, outDirServer } = (0, utils_js_1.getOutDirs)(config);
        [outDirRoot, outDirClient, outDirServer].forEach((outDirAny) => {
            (0, utils_js_1.assertUsage)(fs_1.default.existsSync(outDirAny), `Cannot run ${picocolors_1.default.cyan('$ vite preview')}: your app isn't built (the build directory ${picocolors_1.default.cyan(outDirAny)} is missing). Make sure to run ${picocolors_1.default.cyan('$ vite build')} before running ${picocolors_1.default.cyan('$ vite preview')}.`);
        });
    }
    function addStatic404Middleware(middlewares) {
        const { outDirClient } = (0, utils_js_1.getOutDirs)(config);
        middlewares.use(config.base, (_, res, next) => {
            const file = path_1.default.posix.join(outDirClient, './404.html');
            if (fs_1.default.existsSync(file)) {
                res.statusCode = 404;
                res.end(fs_1.default.readFileSync(file));
            }
            else {
                next();
            }
        });
    }
}
exports.previewConfig = previewConfig;
