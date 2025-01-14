"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findConfigVpsFromStemPackages = void 0;
const utils_js_1 = require("../../utils.js");
const stemUtils_js_1 = require("./stemUtils.js");
const debug = (0, utils_js_1.createDebugger)('vps:stem');
async function findConfigVpsFromStemPackages(root) {
    if (isDeno())
        return [];
    const stemPackages = await (0, stemUtils_js_1.getStemPackages)(root);
    const configVpsFromStemPackages = [];
    debug('Stem packages found:', stemPackages.map(({ stemPackageName, stemPackageRootDir }) => ({ stemPackageName, stemPackageRootDir })));
    await Promise.all(stemPackages.map(async ({ loadModule }) => {
        const moduleExports = await loadModule('vite-plugin-ssr.config.js');
        if (!moduleExports)
            return;
        const configVps = moduleExports.default;
        (0, utils_js_1.assert)((0, utils_js_1.isObject)(configVps));
        configVpsFromStemPackages.push(configVps);
    }));
    return configVpsFromStemPackages;
}
exports.findConfigVpsFromStemPackages = findConfigVpsFromStemPackages;
function isDeno() {
    // @ts-ignore
    return typeof Deno !== 'undefined' && Deno.env;
}
