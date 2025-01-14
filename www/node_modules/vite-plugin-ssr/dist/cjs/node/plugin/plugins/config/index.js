"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVpsConfig = void 0;
const assertVpsConfig_js_1 = require("./assertVpsConfig.js");
const utils_js_1 = require("../../utils.js");
const findConfigVpsFromStemPackages_js_1 = require("./findConfigVpsFromStemPackages.js");
const pickFirst_js_1 = require("./pickFirst.js");
const resolveExtensions_js_1 = require("./resolveExtensions.js");
const resolveBase_js_1 = require("./resolveBase.js");
const getVikeConfig_js_1 = require("../importUserCode/v1-design/getVikeConfig.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function resolveVpsConfig(vpsConfig) {
    return {
        name: 'vite-plugin-ssr:resolveVpsConfig',
        enforce: 'pre',
        async configResolved(config) {
            const promise = resolveConfig(vpsConfig, config);
            config.configVpsPromise = promise;
            await promise;
        }
    };
}
exports.resolveVpsConfig = resolveVpsConfig;
async function resolveConfig(vpsConfig, config) {
    const fromPluginOptions = (vpsConfig ?? {});
    const fromViteConfig = (config.vitePluginSsr ?? {});
    const fromStemPackages = await (0, findConfigVpsFromStemPackages_js_1.findConfigVpsFromStemPackages)(config.root);
    const configs = [fromPluginOptions, ...fromStemPackages, fromViteConfig];
    const extensions = (0, resolveExtensions_js_1.resolveExtensions)(configs, config);
    const { globalVikeConfig: fromPlusConfigFile } = await (0, getVikeConfig_js_1.getVikeConfig)(config.root, (0, utils_js_1.isDev2)(config), extensions);
    configs.push(fromPlusConfigFile);
    (0, assertVpsConfig_js_1.assertVpsConfig)(fromPlusConfigFile, ({ prop, errMsg }) => {
        // TODO: add config file path ?
        return `config ${picocolors_1.default.cyan(prop)} ${errMsg}`;
    });
    (0, assertVpsConfig_js_1.assertVpsConfig)(fromViteConfig, ({ prop, errMsg }) => `vite.config.js#vitePluginSsr.${prop} ${errMsg}`);
    // TODO/v1-release: deprecate this
    (0, assertVpsConfig_js_1.assertVpsConfig)(fromPluginOptions, ({ prop, errMsg }) => `vite.config.js > vite-plugin-ssr option ${prop} ${errMsg}`);
    const { baseServer, baseAssets } = (0, resolveBase_js_1.resolveBase)(configs, config);
    const configVps = {
        disableAutoFullBuild: (0, pickFirst_js_1.pickFirst)(configs.map((c) => c.disableAutoFullBuild)) ?? null,
        extensions,
        prerender: resolvePrerenderOptions(configs),
        includeAssetsImportedByServer: (0, pickFirst_js_1.pickFirst)(configs.map((c) => c.includeAssetsImportedByServer)) ?? true,
        baseServer,
        baseAssets,
        redirects: merge(configs.map((c) => c.redirects)) ?? {},
        disableUrlNormalization: (0, pickFirst_js_1.pickFirst)(configs.map((c) => c.disableUrlNormalization)) ?? false,
        trailingSlash: (0, pickFirst_js_1.pickFirst)(configs.map((c) => c.trailingSlash)) ?? false
    };
    return configVps;
}
function resolvePrerenderOptions(configs) {
    if (!configs.some((c) => c.prerender)) {
        return false;
    }
    const configsPrerender = configs.map((c) => c.prerender).filter(isObject);
    return {
        partial: (0, pickFirst_js_1.pickFirst)(configsPrerender.map((c) => c.partial)) ?? false,
        noExtraDir: (0, pickFirst_js_1.pickFirst)(configsPrerender.map((c) => c.noExtraDir)) ?? false,
        parallel: (0, pickFirst_js_1.pickFirst)(configsPrerender.map((c) => c.parallel)) ?? true,
        disableAutoRun: (0, pickFirst_js_1.pickFirst)(configsPrerender.map((c) => c.disableAutoRun)) ?? false
    };
}
function isObject(p) {
    return typeof p === 'object';
}
function merge(objs) {
    const obj = {};
    objs.forEach((e) => {
        Object.assign(obj, e);
    });
    return obj;
}
