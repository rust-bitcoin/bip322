"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envVarsPlugin = void 0;
const vite_1 = require("vite");
const utils_js_1 = require("../utils.js");
function envVarsPlugin() {
    let envsAll;
    let config;
    return {
        name: 'vite-plugin-ssr:env',
        enforce: 'post',
        configResolved(config_) {
            config = config_;
            config.command;
            envsAll = (0, vite_1.loadEnv)(config.mode, config.envDir || config.root, '');
            config.plugins.sort((0, utils_js_1.lowerFirst)((plugin) => (plugin.name === 'vite:define' ? 1 : 0)));
        },
        transform(code, id, options) {
            (0, utils_js_1.assertPosixPath)(id);
            if (id.includes('/node_modules/'))
                return;
            if (!id.startsWith(config.root))
                return;
            if (!code.includes('import.meta.env.'))
                return;
            const isBuild = config.command === 'build';
            const isClientSide = getIsClientSide(config, options);
            Object.entries(envsAll)
                .filter(([key]) => {
                // Already handled by Vite
                const envPrefix = !config.envPrefix
                    ? []
                    : Array.isArray(config.envPrefix)
                        ? config.envPrefix
                        : [config.envPrefix];
                return !envPrefix.some((prefix) => key.startsWith(prefix));
            })
                .forEach(([key, val]) => {
                const varName = `import.meta.env.${key}`;
                const publicPrefix = 'PUBLIC_ENV__';
                const keyPublic = `${publicPrefix}${key}`;
                const isPrivate = !key.startsWith(publicPrefix);
                if (isPrivate && isClientSide) {
                    if (!code.includes(varName))
                        return;
                    const filePathVite = (0, utils_js_1.getFilePathVite)(id, config.root);
                    const errMsgAddendum = isBuild
                        ? ''
                        : ' (vite-plugin-ssr will prevent your app from building for production)';
                    const errMsg = `${varName} used in ${filePathVite} and therefore included in client-side bundle which can be be a security leak${errMsgAddendum}, remove ${varName} or rename ${key} to ${keyPublic}, see https://vite-plugin-ssr.com/env`;
                    if (isBuild) {
                        (0, utils_js_1.assertUsage)(false, errMsg);
                    }
                    else {
                        // Only a warning for faster development DX (e.g. when use toggles `ssr: boolean` or `onBeforeRenderIsomorph: boolean`)
                        (0, utils_js_1.assertWarning)(false, errMsg, { onlyOnce: true });
                    }
                }
                (0, utils_js_1.assert)(!(isPrivate && isClientSide) || !isBuild);
                code = code.replaceAll(varName, JSON.stringify(val));
            });
            // No need for low-resolution source map since line numbers didn't change. (Does Vite do high-resolution column numbers source mapping?)
            return code;
        }
    };
}
exports.envVarsPlugin = envVarsPlugin;
function getIsClientSide(config, options) {
    const isBuild = config.command === 'build';
    if (isBuild) {
        (0, utils_js_1.assert)(typeof config.build.ssr === 'boolean');
        const isServerSide = config.build.ssr;
        if (options !== undefined) {
            (0, utils_js_1.assert)(options.ssr === isServerSide);
        }
        return !isServerSide;
    }
    else {
        (0, utils_js_1.assert)(config.build.ssr === false);
        (0, utils_js_1.assert)(typeof options?.ssr === 'boolean');
        const isServerSide = options.ssr;
        return !isServerSide;
    }
}
