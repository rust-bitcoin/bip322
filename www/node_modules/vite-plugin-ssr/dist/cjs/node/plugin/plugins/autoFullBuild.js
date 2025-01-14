"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoFullBuild = void 0;
const vite_1 = require("vite");
const utils_js_1 = require("../utils.js");
const runPrerender_js_1 = require("../../prerender/runPrerender.js");
const getConfigVps_js_1 = require("../../shared/getConfigVps.js");
const isViteCliCall_js_1 = require("../shared/isViteCliCall.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
let forceExit = false;
function autoFullBuild() {
    let config;
    let configVps;
    return [
        {
            name: 'vite-plugin-ssr:autoFullBuild',
            apply: 'build',
            enforce: 'pre',
            async configResolved(config_) {
                configVps = await (0, getConfigVps_js_1.getConfigVps)(config_);
                config = config_;
                abortViteBuildSsr(configVps);
            },
            writeBundle: {
                /* We can't use this because it breaks Vite's logging. TODO: try again with latest Vite version.
                sequential: true,
                order: 'pre',
                */
                async handler(_options, bundle) {
                    try {
                        await triggerFullBuild(config, configVps, bundle);
                    }
                    catch (err) {
                        // Avoid Rollup prefixing the error with [vite-plugin-ssr:autoFullBuild], for example see https://github.com/brillout/vite-plugin-ssr/issues/472#issuecomment-1276274203
                        console.error(err);
                        process.exit(1);
                    }
                }
            }
        },
        {
            name: 'vite-plugin-ssr:autoFullBuild:forceExit',
            apply: 'build',
            enforce: 'post',
            closeBundle: {
                sequential: true,
                order: 'post',
                handler() {
                    if (forceExit) {
                        (0, runPrerender_js_1.prerenderForceExit)();
                    }
                }
            }
        }
    ];
}
exports.autoFullBuild = autoFullBuild;
async function triggerFullBuild(config, configVps, bundle) {
    if (config.build.ssr)
        return; // already triggered
    if (isDisabled(configVps))
        return;
    // vite-plugin-ssr.json missing => it isn't a `$ vite build` call (e.g. @vitejs/plugin-legacy calls Vite's build() API) => skip
    if (!bundle['vite-plugin-ssr.json'])
        return;
    const configFromCli = !(0, isViteCliCall_js_1.isViteCliCall)() ? null : (0, isViteCliCall_js_1.getViteConfigFromCli)();
    const configInline = {
        ...configFromCli,
        configFile: configFromCli?.configFile || config.configFile,
        root: config.root,
        build: {
            ...configFromCli?.build
        }
    };
    await (0, vite_1.build)({
        ...configInline,
        build: {
            ...configInline.build,
            ssr: true
        }
    });
    if (configVps.prerender && !configVps.prerender.disableAutoRun) {
        await (0, runPrerender_js_1.prerenderFromAutoFullBuild)({ viteConfig: configInline });
        forceExit = true;
    }
}
function abortViteBuildSsr(configVps) {
    if (!configVps.disableAutoFullBuild && (0, isViteCliCall_js_1.isViteCliCall)() && (0, isViteCliCall_js_1.getViteConfigFromCli)()?.build.ssr) {
        (0, utils_js_1.assertWarning)(false, `The CLI call ${picocolors_1.default.cyan('$ vite build --ssr')} is superfluous since ${picocolors_1.default.cyan('$ vite build')} also builds the server-side. If you want two separate build steps then use https://vite-plugin-ssr.com/disableAutoFullBuild or use Vite's ${picocolors_1.default.cyan('build()')} API.`, { onlyOnce: true });
        process.exit(0);
    }
}
function isDisabled(configVps) {
    if (configVps.disableAutoFullBuild === null) {
        // TODO/v1-release: also enable autoFullBuild when running Vite's build() API
        return !(0, isViteCliCall_js_1.isViteCliCall)();
    }
    else {
        return configVps.disableAutoFullBuild;
    }
}
