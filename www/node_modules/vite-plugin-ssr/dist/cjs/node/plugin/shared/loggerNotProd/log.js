"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenHasErrors = exports.clearScreen = exports.isFirstLog = exports.logDirectly = exports.logWithVikeTag = exports.logWithViteTag = void 0;
const utils_js_1 = require("../../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const isErrorDebug_js_1 = require("../isErrorDebug.js");
const globalContext_js_1 = require("../../../runtime/globalContext.js");
(0, utils_js_1.assertIsNotProductionRuntime)();
let isFirstLog = true;
exports.isFirstLog = isFirstLog;
let screenHasErrors = false;
exports.screenHasErrors = screenHasErrors;
function logWithVikeTag(msg, logType, category, showVikeVersion = false) {
    const projectTag = getProjectTag(showVikeVersion);
    msg = prependTags(msg, projectTag, category, logType);
    logDirectly(msg, logType);
}
exports.logWithVikeTag = logWithVikeTag;
function getProjectTag(showVikeVersion) {
    let projectTag;
    if (showVikeVersion) {
        projectTag = `[${utils_js_1.projectInfo.projectName}@${utils_js_1.projectInfo.projectVersion}]`;
    }
    else {
        projectTag = `[${utils_js_1.projectInfo.projectName}]`;
    }
    return projectTag;
}
function logWithViteTag(msg, logType, category) {
    msg = prependTags(msg, '[vite]', category, logType);
    logDirectly(msg, logType);
}
exports.logWithViteTag = logWithViteTag;
// Not production => every log is triggered by logDirectly()
//  - Even all Vite logs also go through logDirectly() (see interceptors of loggerVite.ts)
//  - Production => logs aren't managed by loggerNotProd.ts => logDirectly() is never called (not even loaded as asserted by assertIsVitePluginCode())
function logDirectly(thing, logType) {
    applyViteSourceMapToStackTrace(thing);
    exports.isFirstLog = isFirstLog = false;
    if (logType === 'info') {
        console.log(thing);
        return;
    }
    if (logType === 'warn') {
        console.warn(thing);
        return;
    }
    if (logType === 'error') {
        exports.screenHasErrors = screenHasErrors = true;
        console.error(thing);
        return;
    }
    if (logType === 'error-recover') {
        // stderr because user will most likely want to know about error recovering
        console.error(thing);
        return;
    }
    (0, utils_js_1.assert)(false);
}
exports.logDirectly = logDirectly;
function clearScreen(viteConfig) {
    // We use Vite's logger in order to respect the user's `clearScreen: false` setting
    viteConfig.logger.clearScreen('error');
    exports.screenHasErrors = screenHasErrors = false;
}
exports.clearScreen = clearScreen;
function applyViteSourceMapToStackTrace(thing) {
    if ((0, isErrorDebug_js_1.isErrorDebug)())
        return;
    if (!(0, utils_js_1.hasProp)(thing, 'stack'))
        return;
    const viteDevServer = (0, globalContext_js_1.getViteDevServer)();
    if (!viteDevServer)
        return;
    // Apply Vite's source maps
    viteDevServer.ssrFixStacktrace(thing);
}
function prependTags(msg, projectTag, category, logType) {
    const color = (s) => {
        if (logType === 'error' && !hasRed(msg))
            return picocolors_1.default.bold(picocolors_1.default.red(s));
        if (logType === 'error-recover' && !hasGreen(msg))
            return picocolors_1.default.bold(picocolors_1.default.green(s));
        if (logType === 'warn' && !hasYellow(msg))
            return picocolors_1.default.yellow(s);
        if (projectTag === '[vite]')
            return picocolors_1.default.bold(picocolors_1.default.cyan(s));
        if (projectTag.startsWith(`[${utils_js_1.projectInfo.projectName}`))
            return picocolors_1.default.bold(picocolors_1.default.cyan(s));
        (0, utils_js_1.assert)(false);
    };
    let tag = color(`${projectTag}`);
    if (category) {
        tag = tag + picocolors_1.default.dim(`[${category}]`);
    }
    const timestamp = picocolors_1.default.dim(new Date().toLocaleTimeString());
    const whitespace = /\s|\[/.test((0, utils_js_1.stripAnsi)(msg)[0]) ? '' : ' ';
    return `${timestamp} ${tag}${whitespace}${msg}`;
}
function hasRed(str) {
    // https://github.com/brillout/picocolors/blob/e291f2a3e3251a7f218ab6369ae94434d85d0eb0/picocolors.js#L57
    return str.includes('\x1b[31m');
}
function hasGreen(str) {
    // https://github.com/brillout/picocolors/blob/e291f2a3e3251a7f218ab6369ae94434d85d0eb0/picocolors.js#L58
    return str.includes('\x1b[32m');
}
function hasYellow(str) {
    // https://github.com/brillout/picocolors/blob/e291f2a3e3251a7f218ab6369ae94434d85d0eb0/picocolors.js#L59
    return str.includes('\x1b[33m');
}
