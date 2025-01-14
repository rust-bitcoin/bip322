"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cac_1 = require("cac");
const path_1 = require("path");
const runPrerender_js_1 = require("../prerender/runPrerender.js");
const utils_js_1 = require("./utils.js");
const cli = (0, cac_1.cac)(utils_js_1.projectInfo.projectName);
cli
    .command('prerender', 'Pre-render the HTML of your pages', { allowUnknownOptions: true })
    .option('--configFile <path>', '[string] Path to vite.config.js')
    .action(async (options) => {
    assertOptions();
    const { partial, noExtraDir, base, parallel, outDir, configFile } = options;
    const root = options.root && (0, path_1.resolve)(options.root);
    await (0, runPrerender_js_1.prerenderFromCLI)({ partial, noExtraDir, base, root, parallel, outDir, configFile });
    (0, runPrerender_js_1.prerenderForceExit)();
});
function assertOptions() {
    // Using process.argv because cac convert names to camelCase
    const rawOptions = process.argv.slice(3);
    Object.values(rawOptions).forEach((option) => {
        (0, utils_js_1.assertUsage)(!option.startsWith('--') ||
            [
                '--root',
                '--partial',
                '--noExtraDir',
                '--clientRouter',
                '--base',
                '--parallel',
                '--outDir',
                '--configFile'
            ].includes(option), 'Unknown option: ' + option);
    });
}
// Listen to unknown commands
cli.on('command:*', () => {
    (0, utils_js_1.assertUsage)(false, 'Unknown command: ' + cli.args.join(' '));
});
cli.help();
cli.version(utils_js_1.projectInfo.projectVersion);
cli.parse(process.argv.length === 2 ? [...process.argv, '--help'] : process.argv);
process.on('unhandledRejection', (rejectValue) => {
    throw rejectValue;
});
