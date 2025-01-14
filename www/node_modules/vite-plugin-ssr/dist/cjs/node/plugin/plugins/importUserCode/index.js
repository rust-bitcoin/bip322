"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importUserCode = void 0;
const vite_1 = require("vite");
const getConfigVps_js_1 = require("../../../shared/getConfigVps.js");
const getVirtualFilePageConfigValuesAll_js_1 = require("./v1-design/getVirtualFilePageConfigValuesAll.js");
const getVirtualFileImportUserCode_js_1 = require("./getVirtualFileImportUserCode.js");
const utils_js_1 = require("../../utils.js");
const virtualFilePageConfigValuesAll_js_1 = require("../../../shared/virtual-files/virtualFilePageConfigValuesAll.js");
const virtualFileImportUserCode_js_1 = require("../../../shared/virtual-files/virtualFileImportUserCode.js");
const getVikeConfig_js_1 = require("./v1-design/getVikeConfig.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const loggerNotProd_js_1 = require("../../shared/loggerNotProd.js");
function importUserCode() {
    let config;
    let configVps;
    return {
        name: 'vite-plugin-ssr:importUserCode',
        config() {
            return {
                experimental: {
                    // TODO/v1-release: remove
                    importGlobRestoreExtension: true
                }
            };
        },
        async configResolved(config_) {
            configVps = await (0, getConfigVps_js_1.getConfigVps)(config_);
            config = config_;
        },
        resolveId(id) {
            if ((0, utils_js_1.isVirtualFileId)(id)) {
                return (0, utils_js_1.resolveVirtualFileId)(id);
            }
        },
        handleHotUpdate(ctx) {
            try {
                return handleHotUpdate(ctx, config, configVps);
            }
            catch (err) {
                // Vite swallows errors thrown by handleHotUpdate()
                console.error(err);
                throw err;
            }
        },
        async load(id, options) {
            const isDev = (0, utils_js_1.isDev1)();
            if (!(0, utils_js_1.isVirtualFileId)(id))
                return undefined;
            id = (0, utils_js_1.getVirtualFileId)(id);
            if ((0, virtualFilePageConfigValuesAll_js_1.isVirtualFileIdPageConfigValuesAll)(id)) {
                const code = await (0, getVirtualFilePageConfigValuesAll_js_1.getVirtualFilePageConfigValuesAll)(id, config.root, isDev, configVps);
                return code;
            }
            if ((0, virtualFileImportUserCode_js_1.isVirtualFileIdImportUserCode)(id)) {
                const code = await (0, getVirtualFileImportUserCode_js_1.getVirtualFileImportUserCode)(id, options, configVps, config, isDev);
                return code;
            }
        },
        configureServer(server) {
            (0, utils_js_1.isDev1_onConfigureServer)();
            handleFileAddRemove(server, config, configVps);
        }
    };
}
exports.importUserCode = importUserCode;
function handleFileAddRemove(server, config, configVps) {
    server.watcher.prependListener('add', (f) => listener(f, false));
    server.watcher.prependListener('unlink', (f) => listener(f, true));
    return;
    function listener(file, isRemove) {
        file = (0, vite_1.normalizePath)(file);
        const isVikeConfig = isVikeConfigModule(file) || (0, getVikeConfig_js_1.isVikeConfigFile)(file);
        if (isVikeConfig) {
            const virtualModules = getVirtualModules(server);
            virtualModules.forEach((mod) => {
                server.moduleGraph.invalidateModule(mod);
            });
            reloadConfig(file, config, configVps, isRemove ? 'removed' : 'created');
        }
    }
}
function handleHotUpdate(ctx, config, configVps) {
    const { file, server } = ctx;
    (0, utils_js_1.assertPosixPath)(file);
    getVikeConfig_js_1.vikeConfigDependencies.forEach((f) => (0, utils_js_1.assertPosixPath)(f));
    const isVikeConfig = isVikeConfigModule(file);
    const isViteModule = ctx.modules.length > 0;
    /* Should we show this?
    // - Can be useful for server files that aren't processed by Vite.
    // - Can be annoying for files that obviously aren't processed by Vite.
    if (!isVikeConfig && !isViteModule) {
      logViteAny(
        `${msg} — ${pc.cyan('no HMR')}, see https://vite-plugin-ssr.com/on-demand-compiler`,
        'info',
        null,
        true,
        clear,
        config
      )
      return
    }
    //*/
    // HMR can resolve errors => we clear previously shown errors.
    // It can hide an error it shouldn't hide (because the error isn't shown again), but it's ok since users can reload the page and the error will be shown again (Vite transpilation errors are shown again upon a page reload).
    if (!isVikeConfig && isViteModule) {
        (0, loggerNotProd_js_1.clearLogs)({ clearErrors: true });
        return;
    }
    if (isVikeConfig) {
        (0, utils_js_1.assert)(!isViteModule);
        reloadConfig(file, config, configVps, 'modified');
        const virtualModules = getVirtualModules(server);
        return virtualModules;
    }
}
function isVikeConfigModule(filePathAbsolute) {
    return getVikeConfig_js_1.vikeConfigDependencies.has(filePathAbsolute);
}
function reloadConfig(filePath, config, configVps, op) {
    {
        const filePathToShowToUser = picocolors_1.default.dim((0, utils_js_1.getFilePathVite)(filePath, config.root, true));
        const msg = `${op} ${filePathToShowToUser}`;
        (0, loggerNotProd_js_1.logConfigInfo)(msg, 'info');
    }
    (0, getVikeConfig_js_1.reloadVikeConfig)(config.root, configVps.extensions);
}
function getVirtualModules(server) {
    const virtualModules = Array.from(server.moduleGraph.urlToModuleMap.keys())
        .filter((url) => (0, virtualFilePageConfigValuesAll_js_1.isVirtualFileIdPageConfigValuesAll)(url) || (0, virtualFileImportUserCode_js_1.isVirtualFileIdImportUserCode)(url))
        .map((url) => {
        const mod = server.moduleGraph.urlToModuleMap.get(url);
        (0, utils_js_1.assert)(mod);
        return mod;
    });
    return virtualModules;
}
