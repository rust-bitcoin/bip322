"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importBuild = void 0;
const utils_1 = require("./utils");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const importBuildFileName_1 = require("../shared/importBuildFileName");
const findBuildEntry_1 = require("./findBuildEntry");
const debugLogs_1 = require("../shared/debugLogs");
const autoImporterFilePath = require.resolve('../autoImporter');
const configVersion = 1;
/**
 * The Vite plugin `importBuild()` does two things:
 *  - Generates an "import build" file at `dist/server/importBuild.cjs`.
 *  - Generates an "auto importer" file at `node_modules/@brillout/vite-plugin-import-build/dist/autoImporter.js`.
 *
 * See https://github.com/brillout/vite-plugin-import-build#what-it-does for more information.
 */
function importBuild(pluginConfigProvidedByLibrary) {
    let config;
    let isServerSideBuild = false;
    return {
        name: `@brillout/vite-plugin-import-build:${pluginConfigProvidedByLibrary.libraryName}`,
        apply: (_, env) => env.command === 'build',
        configResolved(configUnresolved) {
            isServerSideBuild = (0, utils_1.viteIsSSR)(configUnresolved);
            if (!isServerSideBuild)
                return;
            config = resolveConfig(configUnresolved, pluginConfigProvidedByLibrary);
        },
        buildStart() {
            if (!isServerSideBuild)
                return;
            assertOnlyNewerVersions(config);
            clearAutoImporterFile({ status: 'RESET' });
        },
        generateBundle(_rollupOptions, rollupBundle) {
            if (!isServerSideBuild)
                return;
            // Let the newest @brillout/vite-plugin-import-build version generate autoImporter.js
            if (isUsingOlderVitePluginImportBuildVersion(config))
                return;
            if (config._vitePluginImportBuild.filesAlreadyWritten)
                return;
            config._vitePluginImportBuild.filesAlreadyWritten = true;
            // Write dist/server/importBuild.cjs
            writeImportBuildFile(this.emitFile.bind(this), rollupBundle, config);
            // Write node_modules/@brillout/vite-plugin-import-build/dist/autoImporter.js
            const { testCrawler } = config._vitePluginImportBuild;
            const autoImporterDisabled = config._vitePluginImportBuild.disableAutoImporter || (0, utils_1.isYarnPnP)() || testCrawler;
            if (!autoImporterDisabled) {
                writeAutoImporterFile(config);
            }
            else {
                const status = testCrawler ? 'TEST_CRAWLER' : 'DISABLED';
                clearAutoImporterFile({ status });
                (0, debugLogs_1.debugLogsBuildtime)({ disabled: true, paths: null });
            }
        }
    };
}
exports.importBuild = importBuild;
function resolveConfig(configUnresolved, pluginConfigProvidedByLibrary) {
    var _a;
    (0, utils_1.assert)((0, utils_1.viteIsSSR)(configUnresolved));
    const pluginConfigProvidedByUser = configUnresolved.vitePluginImportBuild;
    const pluginConfigResolved = (_a = configUnresolved._vitePluginImportBuild) !== null && _a !== void 0 ? _a : {
        libraries: [],
        filesAlreadyWritten: false,
        configVersion,
        disableAutoImporter: false,
        testCrawler: false
    };
    if (pluginConfigProvidedByLibrary.disableAutoImporter) {
        pluginConfigResolved.disableAutoImporter = true;
    }
    if (pluginConfigProvidedByUser === null || pluginConfigProvidedByUser === void 0 ? void 0 : pluginConfigProvidedByUser._testCrawler) {
        pluginConfigResolved.testCrawler = true;
    }
    (0, utils_1.assert)(configVersion === 1);
    (0, utils_1.assert)(pluginConfigResolved.configVersion === 1);
    if (pluginConfigResolved.configVersion !== configVersion) {
        // We don't use this yet: configVersion never had another value than `1`
        (0, utils_1.assert)(false);
        /*
        const otherLibrary = pluginConfigResolved.libraries[0]
        assert(otherLibrary)
        assert(otherLibrary.libraryName !== pluginConfigProvidedByLibrary.libraryName)
        throw new Error(
          `Conflict between ${pluginConfigProvidedByLibrary.libraryName} and ${otherLibrary.libraryName}. Update both to their latest version and try again.`
        )
        */
    }
    pluginConfigResolved.libraries.push({
        getImporterCode: pluginConfigProvidedByLibrary.getImporterCode,
        libraryName: pluginConfigProvidedByLibrary.libraryName,
        vitePluginImportBuildVersion: utils_1.projectInfo.projectVersion
    });
    (0, utils_1.objectAssign)(configUnresolved, {
        _vitePluginImportBuild: pluginConfigResolved
    });
    const configResolved = configUnresolved;
    return configResolved;
}
function writeImportBuildFile(emitFile, rollupBundle, config) {
    (0, utils_1.assert)((0, utils_1.viteIsSSR)(config));
    const source = [
        '// File generated by https://github.com/brillout/vite-plugin-import-build',
        ...config._vitePluginImportBuild.libraries.map(({ getImporterCode }) => getImporterCode({
            findBuildEntry: (entryName) => (0, findBuildEntry_1.findBuildEntry)(entryName, rollupBundle, config)
        }))
    ].join('\n');
    emitFile({
        fileName: importBuildFileName_1.importBuildFileName,
        type: 'asset',
        source
    });
}
function writeAutoImporterFile(config) {
    const { distServerPathRelative, distServerPathAbsolute } = getDistServerPathRelative(config);
    const importBuildFilePathRelative = path_1.default.posix.join(distServerPathRelative, importBuildFileName_1.importBuildFileName);
    const importBuildFilePathAbsolute = path_1.default.posix.join(distServerPathAbsolute, importBuildFileName_1.importBuildFileName);
    const { root } = config;
    (0, utils_1.assertPosixPath)(root);
    (0, utils_1.assert)(!(0, utils_1.isYarnPnP)());
    (0, fs_1.writeFileSync)(autoImporterFilePath, [
        "exports.status = 'SET';",
        `exports.loadImportBuild = () => { require(${JSON.stringify(importBuildFilePathRelative)}) };`,
        'exports.paths = {',
        `  autoImporterFilePathOriginal: ${JSON.stringify(autoImporterFilePath)},`,
        '  autoImporterFileDirActual: (() => { try { return __dirname } catch { return null } })(),',
        `  importBuildFilePathRelative: ${JSON.stringify(importBuildFilePathRelative)},`,
        `  importBuildFilePathOriginal: ${JSON.stringify(importBuildFilePathAbsolute)},`,
        `  importBuildFilePathResolved: () => require.resolve(${JSON.stringify(importBuildFilePathRelative)}),`,
        '};',
        // Support old version vite-plugin-import-build@0.1.12 which is needed, e.g. if user uses a Telefunc version using 0.1.12 with a vite-plugin-ssr version using 0.2.0
        `exports.load = exports.loadImportBuild;`,
        ''
    ].join('\n'));
}
function clearAutoImporterFile(autoImporter) {
    if ((0, utils_1.isYarnPnP)())
        return;
    (0, fs_1.writeFileSync)(autoImporterFilePath, [`exports.status = '${autoImporter.status}';`, ''].join('\n'));
}
function isUsingOlderVitePluginImportBuildVersion(config) {
    return config._vitePluginImportBuild.libraries.some((library) => {
        if (!library.vitePluginImportBuildVersion)
            return false;
        return isHigherVersion(library.vitePluginImportBuildVersion, utils_1.projectInfo.projectVersion);
    });
}
function isHigherVersion(semver1, semver2) {
    const semver1Parts = parseSemver(semver1);
    const semver2Parts = parseSemver(semver2);
    for (let i = 0; i <= semver1Parts.length - 1; i++) {
        if (semver1Parts[i] === semver2Parts[i])
            continue;
        return semver1Parts[i] > semver2Parts[i];
    }
    return false;
}
function parseSemver(semver) {
    semver = semver.split('-')[0]; // '0.2.16-commit-89bbe89' => '0.2.16'
    (0, utils_1.assert)(/^[0-9\.]+$/.test(semver));
    const parts = semver.split('.');
    (0, utils_1.assert)(parts.length === 3);
    return parts.map((n) => parseInt(n, 10));
}
function getDistServerPathRelative(config) {
    (0, utils_1.assert)((0, utils_1.viteIsSSR)(config));
    const { root } = config;
    (0, utils_1.assertPosixPath)(root);
    (0, utils_1.assert)((0, utils_1.isAbsolutePath)(root));
    const importerDir = getImporterDir();
    const rootRelative = path_1.default.posix.relative(importerDir, root); // To `require()` an absolute path doesn't seem to work on Vercel
    let { outDir } = config.build;
    // SvelteKit doesn't set config.build.outDir to a posix path
    outDir = (0, utils_1.toPosixPath)(outDir);
    if ((0, utils_1.isAbsolutePath)(outDir)) {
        outDir = path_1.default.posix.relative(root, outDir);
        (0, utils_1.assert)(!(0, utils_1.isAbsolutePath)(outDir));
    }
    const distServerPathRelative = path_1.default.posix.join(rootRelative, outDir);
    const distServerPathAbsolute = path_1.default.posix.join(root, outDir);
    (0, debugLogs_1.debugLogsBuildtime)({
        disabled: false,
        paths: { importerDir, root, rootRelative, outDir, distServerPathRelative, distServerPathAbsolute }
    });
    return { distServerPathRelative, distServerPathAbsolute };
}
function getImporterDir() {
    const currentDir = (0, utils_1.toPosixPath)(__dirname + (() => '')()); // trick to avoid `@vercel/ncc` to glob import
    return path_1.default.posix.join(currentDir, '..');
}
function assertOnlyNewerVersions(config) {
    if (!('vitePluginDistImporter' in config)) {
        return;
    }
    const dataOld = config.vitePluginDistImporter;
    const libName = dataOld.libraries[0].libraryName;
    (0, utils_1.assert)(libName);
    // We purposely use `throw new Error()` instead of assertUsage()
    throw new Error(`update ${libName} to its latest version and try again`);
}
