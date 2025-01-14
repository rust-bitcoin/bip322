"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getViteConfigFromCli = exports.isViteCliCall = void 0;
const utils_js_1 = require("../utils.js");
const cac_1 = require("cac");
function isViteCliCall() {
    let execPath = process.argv[1];
    (0, utils_js_1.assert)(execPath);
    execPath = (0, utils_js_1.toPosixPath)(execPath);
    return (
    // pnpm
    execPath.endsWith('/bin/vite.js') ||
        // npm & yarn
        execPath.endsWith('/.bin/vite') ||
        // Global install
        execPath.endsWith('/bin/vite'));
}
exports.isViteCliCall = isViteCliCall;
function getViteConfigFromCli() {
    if (!isViteCliCall())
        return null;
    // Copied and adapted from https://github.com/vitejs/vite/blob/8d0a9c1ab8ddd26973509ca230b29604e872e2cd/packages/vite/src/node/cli.ts#L137-L197
    const cli = (0, cac_1.cac)('vite-plugin-ssr:vite-simulation');
    const desc = 'FAKE_CLI';
    cli
        .option('-c, --config <file>', desc)
        .option('--base <path>', desc)
        .option('-l, --logLevel <level>', desc)
        .option('--clearScreen', desc)
        .option('-d, --debug [feat]', desc)
        .option('-f, --filter <filter>', desc)
        .option('-m, --mode <mode>', desc);
    cli
        .command('build [root]', desc)
        .option('--target <target>', desc)
        .option('--outDir <dir>', desc)
        .option('--assetsDir <dir>', desc)
        .option('--assetsInlineLimit <number>', desc)
        .option('--ssr [entry]', desc)
        .option('--sourcemap', desc)
        .option('--minify [minifier]', desc)
        .option('--manifest [name]', desc)
        .option('--ssrManifest [name]', desc)
        .option('--force', desc)
        .option('--emptyOutDir', desc)
        .option('-w, --watch', desc)
        .action((root, options) => {
        (0, utils_js_1.assert)((0, utils_js_1.isObject)(options));
        const buildOptions = cleanOptions(options);
        (0, utils_js_1.assert)(root === undefined || typeof root === 'string');
        (0, utils_js_1.assert)(options.config === undefined || typeof options.config === 'string');
        configFromCli = {
            root,
            base: options.base,
            mode: options.mode,
            configFile: options.config,
            logLevel: options.logLevel,
            clearScreen: options.clearScreen,
            optimizeDeps: { force: options.force },
            build: buildOptions
        };
    });
    let configFromCli = null;
    cli.parse();
    return configFromCli;
    function cleanOptions(options) {
        const ret = { ...options };
        delete ret['--'];
        delete ret.c;
        delete ret.config;
        delete ret.base;
        delete ret.l;
        delete ret.logLevel;
        delete ret.clearScreen;
        delete ret.d;
        delete ret.debug;
        delete ret.f;
        delete ret.filter;
        delete ret.m;
        delete ret.mode;
        return ret;
    }
}
exports.getViteConfigFromCli = getViteConfigFromCli;
