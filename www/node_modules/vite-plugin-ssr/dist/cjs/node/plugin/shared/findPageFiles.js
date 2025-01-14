"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPageFiles = void 0;
const fast_glob_1 = __importDefault(require("fast-glob"));
const utils_js_1 = require("../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function findPageFiles(config, fileTypes, isDev) {
    const cwd = config.root;
    const timeBase = new Date().getTime();
    let pageFiles = await (0, fast_glob_1.default)(fileTypes.map((fileType) => `**/*${fileType}.${utils_js_1.scriptFileExtensions}`), { ignore: ['**/node_modules/**'], cwd, dot: false });
    pageFiles = pageFiles.map((p) => '/' + (0, utils_js_1.toPosixPath)(p));
    const time = new Date().getTime() - timeBase;
    if (isDev) {
        // We only warn in dev, because while building it's expected to take a long time as fast-glob is competing for resources with other tasks
        (0, utils_js_1.assertWarning)(time < 1.5 * 1000, `Finding your page files ${picocolors_1.default.cyan('**/*.page.*')} took an unexpected long time (${time}ms). Reach out to the vite-plugin-ssr maintainer.`, {
            onlyOnce: 'slow-page-files-search'
        });
    }
    return pageFiles;
}
exports.findPageFiles = findPageFiles;
