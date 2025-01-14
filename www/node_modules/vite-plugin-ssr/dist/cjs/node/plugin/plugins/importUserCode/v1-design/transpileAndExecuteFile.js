"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTmpFile = exports.getConfigExececutionErrorIntroMsg = exports.getConfigBuildErrorFormatted = exports.transpileAndExecuteFile = void 0;
const esbuild_1 = require("esbuild");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const import_1 = require("@brillout/import");
const utils_js_1 = require("../../../utils.js");
const replaceImportStatements_js_1 = require("./replaceImportStatements.js");
const getVikeConfig_js_1 = require("./getVikeConfig.js");
require("source-map-support/register.js");
const getFilePathToShowToUser_js_1 = require("./getFilePathToShowToUser.js");
(0, utils_js_1.assertIsNotProductionRuntime)();
async function transpileAndExecuteFile(filePath, isValueFile, userRootDir) {
    const { code, fileImports } = await transpileFile(filePath, isValueFile, userRootDir);
    const { fileExports } = await executeFile(filePath, code, fileImports);
    return { fileExports };
}
exports.transpileAndExecuteFile = transpileAndExecuteFile;
async function transpileFile(filePath, isValueFile, userRootDir) {
    const { filePathAbsolute } = filePath;
    (0, utils_js_1.assertPosixPath)(filePathAbsolute);
    getVikeConfig_js_1.vikeConfigDependencies.add(filePathAbsolute);
    let code = await transpileWithEsbuild(filePath, isValueFile, userRootDir);
    let fileImports = null;
    {
        const res = transpileImports(code, filePath, isValueFile);
        if (res) {
            code = res.code;
            fileImports = res.fileImports;
        }
    }
    return { code, fileImports };
}
function transpileImports(codeOriginal, filePath, isValueFile) {
    // Do we need to remove the imports?
    const { filePathAbsolute } = filePath;
    (0, utils_js_1.assertPosixPath)(filePathAbsolute);
    const isHeader = isHeaderFile(filePathAbsolute);
    const isPageConfigFile = !isValueFile;
    if (!isHeader && !isPageConfigFile) {
        return null;
    }
    const filePathToShowToUser = (0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(filePath);
    (0, utils_js_1.assertWarning)(isPageConfigFile, `${filePathToShowToUser} is a JavaScript header file (.h.js), but JavaScript header files should only be used for +config.h.js, see https://vite-plugin-ssr.com/header-file`, { onlyOnce: true });
    // Remove the imports
    const res = (0, replaceImportStatements_js_1.replaceImportStatements)(codeOriginal, filePathToShowToUser);
    if (res.noImportStatement) {
        return null;
    }
    const { code, fileImports } = res;
    if (!isHeader) {
        const filePathCorrect = appendHeaderFileExtension(filePathToShowToUser);
        (0, utils_js_1.assertWarning)(false, `Rename ${filePathToShowToUser} to ${filePathCorrect}, see https://vite-plugin-ssr.com/header-file`, { onlyOnce: true });
    }
    return { code, fileImports };
}
async function transpileWithEsbuild(filePath, bundle, userRootDir) {
    const entryFilePath = filePath.filePathAbsolute;
    const entryFileDir = path_1.default.posix.dirname(entryFilePath);
    const options = {
        platform: 'node',
        entryPoints: [entryFilePath],
        sourcemap: 'inline',
        write: false,
        target: ['node14.18', 'node16'],
        outfile: path_1.default.posix.join(
        // Needed for correct inline source map
        entryFileDir, 
        // `write: false` => no file is actually be emitted
        'NEVER_EMITTED.js'),
        logLevel: 'silent',
        format: 'esm',
        bundle,
        minify: false,
        metafile: bundle,
        absWorkingDir: userRootDir
    };
    if (bundle) {
        options.bundle = true;
        options.packages = 'external';
        options.plugins = [
            {
                name: 'vite-plugin-ssr:import-hook',
                setup(b) {
                    b.onLoad({ filter: /./ }, (args) => {
                        let { path } = args;
                        path = (0, utils_js_1.toPosixPath)(path);
                        // We collect the dependency args.path in case it fails to build (upon build error => error is thrown => no metafile)
                        getVikeConfig_js_1.vikeConfigDependencies.add(path);
                        return undefined;
                    });
                    /* To exhaustively collect all dependencies upon build failure, we would also need to use onResolve().
                     *  - Because onLoad() isn't call if the config dependency can't be resolved.
                     *  - For example, the following breaks auto-reload (the config is stuck in its error state and the user needs to touch the importer for the config to reload):
                     *    ```bash
                     *    mv ./some-config-dependency.js /tmp/ && mv /tmp/some-config-dependency.js .
                     *    ```
                     *  - But implementing a fix is complex and isn't worth it.
                    b.onResolve(...)
                    */
                }
            }
        ];
    }
    else {
        // Avoid dead-code elimination to ensure unused imports aren't removed.
        // Esbuild still sometimes removes unused imports because of TypeScript: https://github.com/evanw/esbuild/issues/3034
        options.treeShaking = false;
    }
    let result;
    try {
        result = await (0, esbuild_1.build)(options);
    }
    catch (err) {
        await formatBuildErr(err, filePath);
        throw err;
    }
    if (bundle) {
        (0, utils_js_1.assert)(result.metafile);
        Object.keys(result.metafile.inputs).forEach((filePathRelative) => {
            filePathRelative = (0, utils_js_1.toPosixPath)(filePathRelative);
            (0, utils_js_1.assertPosixPath)(userRootDir);
            const filePathAbsolute = path_1.default.posix.join(userRootDir, filePathRelative);
            getVikeConfig_js_1.vikeConfigDependencies.add(filePathAbsolute);
        });
    }
    const code = result.outputFiles[0].text;
    (0, utils_js_1.assert)(typeof code === 'string');
    return code;
}
async function executeFile(filePath, code, fileImports) {
    const { filePathAbsolute, filePathRelativeToUserRootDir } = filePath;
    // Alternative to using a temporary file: https://github.com/vitejs/vite/pull/13269
    //  - But seems to break source maps, so I don't think it's worth it
    const filePathTmp = getFilePathTmp(filePathAbsolute);
    fs_1.default.writeFileSync(filePathTmp, code);
    const clean = () => fs_1.default.unlinkSync(filePathTmp);
    let fileExports = {};
    try {
        fileExports = await (0, import_1.import_)(filePathTmp);
    }
    catch (err) {
        triggerPrepareStackTrace(err);
        const errIntroMsg = getErrIntroMsg('execute', filePath);
        (0, utils_js_1.assert)((0, utils_js_1.isObject)(err));
        execErrIntroMsg.set(err, errIntroMsg);
        throw err;
    }
    finally {
        clean();
    }
    // Return a plain JavaScript object
    //  - import() returns `[Module: null prototype] { default: { onRenderClient: '...' }}`
    //  - We don't need this special object
    fileExports = { ...fileExports };
    if (fileImports) {
        (0, utils_js_1.assert)(filePathRelativeToUserRootDir !== undefined);
        const filePath = filePathRelativeToUserRootDir ?? filePathAbsolute;
        assertFileImports(fileImports, fileExports, filePath);
    }
    return { fileExports };
}
const formatted = '_formatted';
function getConfigBuildErrorFormatted(err) {
    if (!(0, utils_js_1.isObject)(err))
        return null;
    if (!(formatted in err))
        return null;
    (0, utils_js_1.assert)(typeof err[formatted] === 'string');
    return err[formatted];
}
exports.getConfigBuildErrorFormatted = getConfigBuildErrorFormatted;
async function formatBuildErr(err, filePath) {
    (0, utils_js_1.assert)((0, utils_js_1.isObject)(err) && err.errors);
    const msgEsbuild = (await (0, esbuild_1.formatMessages)(err.errors, {
        kind: 'error',
        color: true
    }))
        .map((m) => m.trim())
        .join('\n');
    const msgIntro = getErrIntroMsg('transpile', filePath);
    err[formatted] = `${msgIntro}\n${msgEsbuild}`;
}
const execErrIntroMsg = new WeakMap();
function getConfigExececutionErrorIntroMsg(err) {
    if (!(0, utils_js_1.isObject)(err))
        return null;
    const errIntroMsg = execErrIntroMsg.get(err);
    return errIntroMsg ?? null;
}
exports.getConfigExececutionErrorIntroMsg = getConfigExececutionErrorIntroMsg;
const tmpPrefix = `[build-`;
function getFilePathTmp(filePath) {
    (0, utils_js_1.assertPosixPath)(filePath);
    const dirname = path_1.default.posix.dirname(filePath);
    const filename = path_1.default.posix.basename(filePath);
    // Syntax with semicolon `[build:${/*...*/}]` doesn't work on Windows: https://github.com/brillout/vite-plugin-ssr/issues/800#issuecomment-1517329455
    const tag = `${tmpPrefix}${(0, utils_js_1.getRandomId)(12)}]`;
    const filePathTmp = path_1.default.posix.join(dirname, `${tag}${filename}.mjs`);
    return filePathTmp;
}
function isTmpFile(filePath) {
    (0, utils_js_1.assertPosixPath)(filePath);
    const fileName = path_1.default.posix.basename(filePath);
    return fileName.startsWith(tmpPrefix);
}
exports.isTmpFile = isTmpFile;
function assertFileImports(fileImports, fileExports, filePath) {
    (0, utils_js_1.assertDefaultExportObject)(fileExports, filePath);
    const exportedStrings = getExportedStrings(fileExports.default);
    Object.values(exportedStrings).forEach((exportVal) => {
        if (typeof exportVal !== 'string')
            return;
        if (!(0, replaceImportStatements_js_1.isImportData)(exportVal))
            return;
        const importDataString = exportVal;
        fileImports.forEach((fileImport) => {
            if (fileImport.importDataString === importDataString) {
                fileImport.isReExported = true;
            }
        });
    });
    const fileImportsUnused = fileImports.filter((fi) => !fi.isReExported);
    if (fileImportsUnused.length === 0)
        return;
    const importStatements = (0, utils_js_1.unique)(fileImportsUnused.map((fi) => fi.importStatementCode));
    const importNamesUnused = fileImportsUnused.map((fi) => picocolors_1.default.cyan(fi.importLocalName)).join(', ');
    const singular = fileImportsUnused.length === 1;
    (0, utils_js_1.assertWarning)(fileImportsUnused.length === 0, [
        `${filePath} imports the following:`,
        ...importStatements.map((s) => picocolors_1.default.cyan(`  ${s}`)),
        `But the import${singular ? '' : 's'} ${importNamesUnused} ${singular ? "isn't" : "aren't"} re-exported at ${picocolors_1.default.cyan('export default { ... }')} and therefore ${singular ? 'has' : 'have'} no effect, see explanation at https://vite-plugin-ssr.com/header-file`
    ].join('\n'), { onlyOnce: true });
}
function getExportedStrings(obj) {
    const exportedStrings = [];
    Object.values(obj).forEach((val) => {
        if (typeof val === 'string') {
            exportedStrings.push(val);
        }
        else if (Array.isArray(val)) {
            val.forEach((v) => {
                if (typeof v === 'string') {
                    exportedStrings.push(v);
                }
            });
        }
    });
    return exportedStrings;
}
function isHeaderFile(filePath) {
    const basenameParts = path_1.default.posix.basename(filePath).split('.');
    return basenameParts.includes('h');
}
function appendHeaderFileExtension(filePath) {
    const basenameParts = path_1.default.posix.basename(filePath).split('.');
    basenameParts.splice(-1, 0, 'h');
    const basenameCorrect = basenameParts.join('.');
    return path_1.default.posix.join(path_1.default.posix.dirname(filePath), basenameCorrect);
}
// Needed for the npm package 'source-map-support'. The Error.prepareStackTrace() hook of 'source-map-support' needs to be called before the file containing the source map is removed. The clean() call above removes the transpiled file from disk but it contains the inline source map.
function triggerPrepareStackTrace(err) {
    if ((0, utils_js_1.isObject)(err)) {
        // Accessing err.stack triggers prepareStackTrace()
        const { stack } = err;
        // Ensure no compiler removes the line above
        if (1 + 1 === 3)
            console.log('I_AM_NEVER_SHOWN' + stack);
    }
}
function getErrIntroMsg(operation, filePath) {
    const msg = [
        picocolors_1.default.red(`Failed to ${operation}`),
        picocolors_1.default.bold(picocolors_1.default.red((0, getFilePathToShowToUser_js_1.getFilePathToShowToUser)(filePath))),
        picocolors_1.default.red(`because:`)
    ].join(' ');
    return msg;
}
