"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeClientEntries = exports.assertRollupInput = exports.buildConfig = void 0;
const utils_js_1 = require("../utils.js");
const virtualFileImportUserCode_js_1 = require("../../shared/virtual-files/virtualFileImportUserCode.js");
const getVikeConfig_js_1 = require("./importUserCode/v1-design/getVikeConfig.js");
const utils_js_2 = require("../../../shared/page-configs/utils.js");
const findPageFiles_js_1 = require("../shared/findPageFiles.js");
const getConfigVps_js_1 = require("../../shared/getConfigVps.js");
const virtualFilePageConfigValuesAll_js_1 = require("../../shared/virtual-files/virtualFilePageConfigValuesAll.js");
const extractAssetsQuery_js_1 = require("../../shared/extractAssetsQuery.js");
const module_1 = require("module");
const getClientEntryFilePath_js_1 = require("../../shared/getClientEntryFilePath.js");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// @ts-ignore Shimed by dist-cjs-fixup.js for CJS build.
const importMetaUrl = `file://${__filename}`;
const require_ = (0, module_1.createRequire)(importMetaUrl);
const manifestTempFile = '_temp_manifest.json';
function buildConfig() {
    let generateManifest;
    return {
        name: 'vite-plugin-ssr:buildConfig',
        apply: 'build',
        enforce: 'post',
        configResolved: {
            order: 'post',
            async handler(config) {
                assertRollupInput(config);
                const userInputs = normalizeRollupInput(config.build.rollupOptions.input);
                const entries = await getEntries(config);
                (0, utils_js_1.assert)(Object.keys(entries).length > 0);
                const input = {
                    ...entries,
                    ...userInputs
                };
                config.build.rollupOptions.input = input;
                addLogHook();
            }
        },
        config(config) {
            generateManifest = !(0, utils_js_1.viteIsSSR)(config);
            return {
                build: {
                    outDir: (0, utils_js_1.resolveOutDir)(config),
                    manifest: generateManifest ? manifestTempFile : false,
                    copyPublicDir: !(0, utils_js_1.viteIsSSR)(config)
                }
            };
        },
        async writeBundle(options, bundle) {
            const manifestEntry = bundle[manifestTempFile];
            if (generateManifest) {
                (0, utils_js_1.assert)(manifestEntry);
                const { dir } = options;
                (0, utils_js_1.assert)(dir);
                const manifestFilePathOld = path_1.default.join(dir, manifestEntry.fileName);
                // Ideally we'd move dist/_temp_manifest.json to dist/server/client-assets.json instead of dist/assets.json
                //  - But we can't because there is no guarentee whether dist/server/ is generated before or after dist/client/ (generating dist/server/ after dist/client/ erases dist/server/client-assets.json)
                //  - We'll able to do so once we replace `$ vite build` with `$ vike build`
                const manifestFilePathNew = path_1.default.join(dir, '..', 'assets.json');
                await promises_1.default.rename(manifestFilePathOld, manifestFilePathNew);
            }
            else {
                (0, utils_js_1.assert)(!manifestEntry);
            }
        }
    };
}
exports.buildConfig = buildConfig;
async function getEntries(config) {
    const configVps = await (0, getConfigVps_js_1.getConfigVps)(config);
    const pageFileEntries = await getPageFileEntries(config, configVps.includeAssetsImportedByServer); // TODO/v1-release: remove
    const { pageConfigs } = await (0, getVikeConfig_js_1.getVikeConfig)(config.root, false, configVps.extensions);
    (0, utils_js_1.assertUsage)(Object.keys(pageFileEntries).length !== 0 || pageConfigs.length !== 0, 'At least one page should be defined, see https://vite-plugin-ssr.com/add');
    if ((0, utils_js_1.viteIsSSR)(config)) {
        const serverEntries = analyzeServerEntries(pageConfigs);
        const entries = {
            pageFiles: virtualFileImportUserCode_js_1.virtualFileIdImportUserCodeServer,
            importBuild: resolve('dist/esm/node/importBuild.js'),
            ...pageFileEntries,
            ...serverEntries
        };
        return entries;
    }
    else {
        let { hasClientRouting, hasServerRouting, clientEntries } = analyzeClientEntries(pageConfigs, config);
        if (Object.entries(pageFileEntries).length > 0) {
            hasClientRouting = true;
            hasServerRouting = true;
        }
        const entries = {
            ...clientEntries,
            ...pageFileEntries
        };
        const clientRoutingEntry = resolve(`dist/esm/client/client-routing-runtime/entry.js`);
        const serverRoutingEntry = resolve(`dist/esm/client/server-routing-runtime/entry.js`);
        if (hasClientRouting) {
            entries['entries/entry-client-routing'] = clientRoutingEntry;
        }
        if (hasServerRouting) {
            entries['entries/entry-server-routing'] = serverRoutingEntry;
        }
        return entries;
    }
}
function analyzeClientEntries(pageConfigs, config) {
    let hasClientRouting = false;
    let hasServerRouting = false;
    let clientEntries = {};
    let clientFilePaths = [];
    pageConfigs.forEach((pageConfig) => {
        const configValue = (0, utils_js_2.getConfigValue)(pageConfig, 'clientRouting', 'boolean');
        if (configValue?.value) {
            hasClientRouting = true;
        }
        else {
            hasServerRouting = true;
        }
        {
            const { entryName, entryTarget } = getEntryFromPageConfig(pageConfig, true);
            clientEntries[entryName] = entryTarget;
        }
        {
            const clientFilePath = (0, getClientEntryFilePath_js_1.getClientEntryFilePath)(pageConfig);
            if (clientFilePath) {
                clientFilePaths.push(clientFilePath);
            }
        }
    });
    clientFilePaths = (0, utils_js_1.unique)(clientFilePaths);
    clientFilePaths.forEach((pageFile) => {
        const { entryName, entryTarget } = getEntryFromFilePath(pageFile, config);
        clientEntries[entryName] = entryTarget;
    });
    return { hasClientRouting, hasServerRouting, clientEntries };
}
exports.analyzeClientEntries = analyzeClientEntries;
function analyzeServerEntries(pageConfigs) {
    const serverEntries = {};
    pageConfigs.forEach((pageConfig) => {
        const { entryName, entryTarget } = getEntryFromPageConfig(pageConfig, false);
        serverEntries[entryName] = entryTarget;
    });
    return serverEntries;
}
// Ensure Rollup creates entries for each page file, see https://github.com/brillout/vite-plugin-ssr/issues/350
// (Otherwise the page files may be missing in the client manifest.json)
async function getPageFileEntries(config, includeAssetsImportedByServer) {
    const isForClientSide = !(0, utils_js_1.viteIsSSR)(config);
    const fileTypes = isForClientSide ? ['.page', '.page.client'] : ['.page', '.page.server'];
    if (isForClientSide && includeAssetsImportedByServer) {
        fileTypes.push('.page.server');
    }
    let pageFiles = await (0, findPageFiles_js_1.findPageFiles)(config, fileTypes, false);
    const pageFileEntries = {};
    pageFiles = (0, utils_js_1.unique)(pageFiles);
    pageFiles.forEach((pageFile) => {
        let addExtractAssetsQuery = false;
        if (isForClientSide && pageFile.includes('.page.server.')) {
            (0, utils_js_1.assert)(includeAssetsImportedByServer);
            addExtractAssetsQuery = true;
        }
        const { entryName, entryTarget } = getEntryFromFilePath(pageFile, config, addExtractAssetsQuery);
        pageFileEntries[entryName] = entryTarget;
    });
    return pageFileEntries;
}
function getEntryFromFilePath(filePath, config, addExtractAssetsQuery) {
    (0, utils_js_1.assertPosixPath)(filePath);
    (0, utils_js_1.assert)(filePath.startsWith('/'));
    let entryTarget = (0, utils_js_1.getFilePathAbsolute)(filePath, config);
    if (addExtractAssetsQuery)
        entryTarget = (0, extractAssetsQuery_js_1.extractAssetsAddQuery)(entryTarget);
    let entryName = filePath;
    if (addExtractAssetsQuery)
        entryName = (0, extractAssetsQuery_js_1.extractAssetsAddQuery)(entryName);
    entryName = (0, utils_js_1.removeFileExtention)(entryName);
    entryName = prependEntriesDir(entryName);
    return { entryName, entryTarget };
}
function getEntryFromPageConfig(pageConfig, isForClientSide) {
    let { pageId } = pageConfig;
    const entryTarget = (0, virtualFilePageConfigValuesAll_js_1.getVirtualFileIdPageConfigValuesAll)(pageId, isForClientSide);
    let entryName = pageId;
    entryName = prependEntriesDir(entryName);
    return { entryName, entryTarget };
}
function prependEntriesDir(entryName) {
    if (entryName.startsWith('/')) {
        entryName = entryName.slice(1);
    }
    (0, utils_js_1.assert)(!entryName.startsWith('/'));
    entryName = `entries/${entryName}`;
    return entryName;
}
function resolve(filePath) {
    (0, utils_js_1.assert)(filePath.startsWith('dist/'));
    // [RELATIVE_PATH_FROM_DIST] Current directory: node_modules/vite-plugin-ssr/dist/esm/node/plugin/plugins/
    return require_.resolve(`../../../../../${filePath}`);
}
function normalizeRollupInput(input) {
    if (!input) {
        return {};
    }
    // Usually `input` is an oject, but the user can set it as a `string` or `string[]`
    if (typeof input === 'string') {
        input = [input];
    }
    if (Array.isArray(input)) {
        return Object.fromEntries(input.map((input) => [input, input]));
    }
    (0, utils_js_1.assert)((0, utils_js_1.isObject)(input));
    return input;
}
function addLogHook() {
    const tty = process.stdout.isTTY && !process.env.CI; // Equals https://github.com/vitejs/vite/blob/193d55c7b9cbfec5b79ebfca276d4a721e7de14d/packages/vite/src/node/plugins/reporter.ts#L27
    if (!tty)
        return;
    let lastLog = null;
    ['stdout', 'stderr'].forEach((stdName) => {
        var methodOriginal = process[stdName].write;
        process[stdName].write = function (...args) {
            lastLog = String(args[0]);
            return methodOriginal.apply(process[stdName], args);
        };
    });
    // Exhaustive list extracted from writeLine() calls at https://github.com/vitejs/vite/blob/193d55c7b9cbfec5b79ebfca276d4a721e7de14d/packages/vite/src/node/plugins/reporter.ts
    // prettier-ignore
    const viteTransientLogs = [
        'transforming (',
        'rendering chunks (',
        'computing gzip size ('
    ];
    (0, utils_js_1.addOnBeforeLogHook)(() => {
        // Using viteTransientLogs is very conservative as clearing the current line is low risk. (We can assume that important messages, such as errors, include a trailing new line. Usually, only transient messages have no trailing new lines.)
        if (viteTransientLogs.some((s) => lastLog?.startsWith(s))) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }
    });
}
function assertRollupInput(config) {
    const userInputs = normalizeRollupInput(config.build.rollupOptions.input);
    const htmlInputs = Object.values(userInputs).filter((entry) => entry.endsWith('.html') || entry.endsWith('.htm'));
    const htmlInput = htmlInputs[0];
    (0, utils_js_1.assertUsage)(htmlInput === undefined, `The entry ${htmlInput} of config build.rollupOptions.input is an HTML entry which is forbidden when using vite-plugin-ssr, instead follow https://vite-plugin-ssr.com/add`);
}
exports.assertRollupInput = assertRollupInput;
