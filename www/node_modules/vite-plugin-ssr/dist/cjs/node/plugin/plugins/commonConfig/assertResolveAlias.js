"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertResolveAlias = void 0;
const utils_js_1 = require("../../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
// TODO/v1-release: replace assertWarning() with assertUsage()
function assertResolveAlias(config) {
    const aliases = getAliases(config);
    const errPrefix = config.configFile || 'Your Vite configuration';
    const errSuffix1 = 'see https://vite-plugin-ssr.com/path-aliases#vite';
    const deprecation = 'which will be deprecated in the next major release';
    const errSuffix2 = `${deprecation}, use a string insead and ${errSuffix1}`;
    aliases.forEach((alias) => {
        const { customResolver, find } = alias;
        {
            const msg = `${errPrefix} defines resolve.alias with customResolver() ${errSuffix2}`;
            (0, utils_js_1.assertWarning)(customResolver === undefined, msg, { onlyOnce: true });
        }
        if (typeof find !== 'string') {
            (0, utils_js_1.assert)(find instanceof RegExp);
            // Skip aliases set by Vite:
            //   /^\/?@vite\/env/
            //   /^\/?@vite\/client/
            if (find.toString().includes('@vite'))
                return;
            // Skip alias /^solid-refresh$/ set by vite-plugin-solid
            if (find.toString().includes('solid-refresh'))
                return;
            {
                const msg = `${errPrefix} defines resolve.alias with a regular expression ${errSuffix2}`;
                (0, utils_js_1.assertWarning)(false, msg, {
                    onlyOnce: true
                });
            }
        }
        else {
            // Allow un-distinguishable aliases set by @preact/preset-vite
            if (find.startsWith('react'))
                return;
            {
                const msg = `${errPrefix} defines an invalid ${picocolors_1.default.cyan('resolve.alias')}: a path alias cannot be the empty string ${picocolors_1.default.cyan("''")}`;
                (0, utils_js_1.assertUsage)(find !== '', msg);
            }
            // Ensure path alias are distinguishable from npm package names, which is needed by:
            //  - determineOptimizeDeps()
            //  - extractAssets
            //  - in general: using un-distinguishable path aliases is asking for trouble
            if (!(0, utils_js_1.isValidPathAlias)(find)) {
                if (find.startsWith('@')) {
                    const msg = `${errPrefix} defines an invalid resolve.alias ${deprecation}: a path alias cannot start with ${picocolors_1.default.cyan('@')}, ${errSuffix1}`;
                    (0, utils_js_1.assertWarning)(false, msg, { onlyOnce: true });
                }
                else {
                    const msg = `${errPrefix} defines an invalid resolve.alias ${deprecation}: a path alias needs to start with a special character, ${errSuffix1}`;
                    (0, utils_js_1.assertWarning)(false, msg, { onlyOnce: true });
                }
            }
        }
    });
}
exports.assertResolveAlias = assertResolveAlias;
function getAliases(config) {
    const { alias } = config.resolve;
    if (!Array.isArray(alias)) {
        return [alias];
    }
    else {
        return alias;
    }
}
