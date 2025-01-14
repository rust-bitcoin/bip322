"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBaseFromUserConfig = exports.resolveBase = void 0;
const utils_js_1 = require("../../utils.js");
const pickFirst_js_1 = require("./pickFirst.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
function resolveBase(configs, config) {
    const baseServer = (0, pickFirst_js_1.pickFirst)(configs.map((c) => c.baseServer)) ?? null;
    const baseAssets = (0, pickFirst_js_1.pickFirst)(configs.map((c) => c.baseAssets)) ?? null;
    let baseOriginal = config._baseOriginal;
    if (baseOriginal === '/__UNSET__')
        baseOriginal = null;
    (0, utils_js_1.assert)(baseOriginal === null || typeof baseOriginal == 'string');
    return resolve(baseOriginal, baseServer, baseAssets);
}
exports.resolveBase = resolveBase;
function resolveBaseFromUserConfig(config, configVps) {
    return resolve(config.base ?? null, configVps?.baseServer ?? null, configVps?.baseAssets ?? null);
}
exports.resolveBaseFromUserConfig = resolveBaseFromUserConfig;
function resolve(base, baseServer_, baseAssets_) {
    {
        const wrongBase = (val) => `should start with ${picocolors_1.default.cyan('/')}, ${picocolors_1.default.cyan('http://')}, or ${picocolors_1.default.cyan('https://')} (it's ${picocolors_1.default.cyan(val)} instead)`;
        (0, utils_js_1.assertUsage)(base === null || (0, utils_js_1.isBaseAssets)(base), `vite.config.js#base ${wrongBase(base)}`);
        (0, utils_js_1.assertUsage)(baseAssets_ === null || (0, utils_js_1.isBaseAssets)(baseAssets_), `Config ${picocolors_1.default.cyan('baseAssets')} ${wrongBase(baseAssets_)}`);
        (0, utils_js_1.assertUsage)(baseServer_ === null || baseServer_.startsWith('/'), `Config ${picocolors_1.default.cyan('baseServer')} should start with a leading slash ${picocolors_1.default.cyan('/')} (it's ${picocolors_1.default.cyan(String(baseServer_))} instead)`);
    }
    if (base) {
        if (base.startsWith('http')) {
            baseAssets_ = baseAssets_ ?? base;
        }
        else {
            baseAssets_ = baseAssets_ ?? base;
            baseServer_ = baseServer_ ?? base;
        }
    }
    const baseServer = baseServer_ ?? '/';
    const baseAssets = baseAssets_ ?? '/';
    (0, utils_js_1.assert)((0, utils_js_1.isBaseAssets)(baseAssets));
    (0, utils_js_1.assert)((0, utils_js_1.isBaseServer)(baseServer));
    return {
        baseServer,
        baseAssets
    };
}
