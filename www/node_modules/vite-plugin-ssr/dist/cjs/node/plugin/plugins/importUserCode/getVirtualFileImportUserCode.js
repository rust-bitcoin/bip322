"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVirtualFileImportUserCode = void 0;
const utils_js_1 = require("../../utils.js");
const virtualFileImportUserCode_js_1 = require("../../../shared/virtual-files/virtualFileImportUserCode.js");
const fileTypes_js_1 = require("../../../../shared/getPageFiles/fileTypes.js");
const path_1 = __importDefault(require("path"));
const getVirtualFilePageConfigs_js_1 = require("./v1-design/getVirtualFilePageConfigs.js");
const generateEagerImport_js_1 = require("./generateEagerImport.js");
async function getVirtualFileImportUserCode(id, options, configVps, config, isDev) {
    const idParsed = (0, virtualFileImportUserCode_js_1.isVirtualFileIdImportUserCode)(id);
    (0, utils_js_1.assert)(idParsed);
    const { isForClientSide, isClientRouting } = idParsed;
    (0, utils_js_1.assert)(isForClientSide === !(0, utils_js_1.viteIsSSR_options)(options));
    const isPrerendering = !!configVps.prerender;
    const code = await getCode(config, configVps, isForClientSide, isClientRouting, isPrerendering, isDev, id);
    return code;
}
exports.getVirtualFileImportUserCode = getVirtualFileImportUserCode;
async function getCode(config, configVps, isForClientSide, isClientRouting, isPrerendering, isDev, id) {
    const { command } = config;
    (0, utils_js_1.assert)(command === 'serve' || command === 'build');
    const isBuild = command === 'build';
    (0, utils_js_1.assert)(isDev === !isBuild);
    let content = '';
    {
        const globRoots = getGlobRoots(config, configVps);
        (0, utils_js_1.debugGlob)('Glob roots: ', globRoots);
        content += await generateGlobImports(globRoots, isBuild, isForClientSide, isClientRouting, configVps, isPrerendering, config, isDev, id);
    }
    {
        const extensionsImportPaths = configVps.extensions
            .map(({ pageConfigsDistFiles }) => pageConfigsDistFiles)
            .flat()
            .filter(utils_js_1.isNotNullish)
            .map(({ importPath }) => importPath);
        content += generateExtensionImports(extensionsImportPaths, isForClientSide, isBuild, isClientRouting, isPrerendering);
    }
    (0, utils_js_1.debugGlob)(`Glob imports for ${isForClientSide ? 'client' : 'server'}:\n`, content);
    return content;
}
function generateExtensionImports(extensionsImportPaths, isForClientSide, isBuild, isClientRouting, isPrerendering) {
    let fileContent = '\n\n';
    extensionsImportPaths
        .filter((importPath) => {
        (0, utils_js_1.assert)(
        // V1 design
        importPath.includes('+') ||
            // V0.4 design
            importPath.includes('.page.'));
        return !importPath.includes('+');
    })
        .forEach((importPath) => {
        const fileType = (0, fileTypes_js_1.determineFileType)(importPath);
        const { includeImport, includeExportNames } = determineInjection({
            fileType,
            isForClientSide,
            isClientRouting,
            isPrerendering,
            isBuild
        });
        if (includeImport) {
            fileContent += addImport(importPath, fileType, false, isBuild);
        }
        if (includeExportNames) {
            fileContent += addImport(importPath, fileType, true, isBuild);
        }
        if (!includeImport && !includeExportNames && !isForClientSide) {
            fileContent += `pageFilesList.push("${importPath}");` + '\n';
        }
    });
    return fileContent;
}
function determineInjection({ fileType, isForClientSide, isClientRouting, isPrerendering, isBuild }) {
    if (!isForClientSide) {
        return {
            includeImport: fileType === '.page.server' || fileType === '.page' || fileType === '.page.route',
            includeExportNames: isPrerendering && isBuild
                ? fileType === '.page.client' || fileType === '.page.server' || fileType === '.page' // We extensively use `PageFile['exportNames']` while pre-rendering, in order to avoid loading page files unnecessarily, and therefore reducing memory usage.
                : fileType === '.page.client'
        };
    }
    else {
        const includeImport = fileType === '.page.client' || fileType === '.css' || fileType === '.page';
        if (!isClientRouting) {
            return {
                includeImport,
                includeExportNames: false
            };
        }
        else {
            return {
                includeImport: includeImport || fileType === '.page.route',
                includeExportNames: fileType === '.page.client' || fileType === '.page.server' || fileType === '.page'
            };
        }
    }
}
function addImport(importPath, fileType, exportNames, isBuild) {
    const pageFilesVar = (() => {
        if (exportNames) {
            if (isBuild) {
                return 'pageFilesExportNamesEager';
            }
            else {
                return 'pageFilesExportNamesLazy';
            }
        }
        else {
            if (fileType === '.page.route') {
                return 'pageFilesEager';
            }
            else {
                return 'pageFilesLazy';
            }
        }
    })();
    const query = !exportNames ? '' : '?extractExportNames';
    let fileContent = '';
    const mapVar = `${pageFilesVar}['${fileType}']`;
    fileContent += `${mapVar} = ${mapVar} ?? {};\n`;
    const value = (() => {
        if (!pageFilesVar.endsWith('Eager')) {
            return `() => import('${importPath}${query}')`;
        }
        else {
            const { importVar, importStatement } = (0, generateEagerImport_js_1.generateEagerImport)(`${importPath}${query}`);
            fileContent += importStatement + '\n';
            return importVar;
        }
    })();
    fileContent += `${mapVar}['${importPath}'] = ${value};\n`;
    return fileContent;
}
async function generateGlobImports(globRoots, isBuild, isForClientSide, isClientRouting, configVps, isPrerendering, config, isDev, id) {
    let fileContent = `// Generatead by node/plugin/plugins/virtualFiles/index.ts

export const pageFilesLazy = {};
export const pageFilesEager = {};
export const pageFilesExportNamesLazy = {};
export const pageFilesExportNamesEager = {};
export const pageFilesList = [];
export const neverLoaded = {};
export const isGeneratedFile = true;

${await (0, getVirtualFilePageConfigs_js_1.getVirtualFilePageConfigs)(config.root, isForClientSide, isDev, id, configVps, isClientRouting)}

`;
    fileTypes_js_1.fileTypes
        .filter((fileType) => fileType !== '.css')
        .forEach((fileType) => {
        (0, utils_js_1.assert)(fileType !== '.css');
        const { includeImport, includeExportNames } = determineInjection({
            fileType,
            isForClientSide,
            isClientRouting,
            isPrerendering,
            isBuild
        });
        if (includeImport) {
            fileContent += getGlobs(globRoots, isBuild, fileType);
        }
        if (includeExportNames) {
            fileContent += getGlobs(globRoots, isBuild, fileType, 'extractExportNames');
        }
    });
    if (configVps.includeAssetsImportedByServer && isForClientSide) {
        fileContent += getGlobs(globRoots, isBuild, '.page.server', 'extractAssets');
    }
    return fileContent;
}
function getGlobs(globRoots, isBuild, fileType, query) {
    const isEager = isBuild && (query === 'extractExportNames' || fileType === '.page.route');
    let pageFilesVar;
    if (query === 'extractExportNames') {
        if (!isEager) {
            pageFilesVar = 'pageFilesExportNamesLazy';
        }
        else {
            pageFilesVar = 'pageFilesExportNamesEager';
        }
    }
    else if (query === 'extractAssets') {
        (0, utils_js_1.assert)(!isEager);
        pageFilesVar = 'neverLoaded';
    }
    else if (!query) {
        if (!isEager) {
            pageFilesVar = 'pageFilesLazy';
        }
        else {
            // Used for `.page.route.js` files
            pageFilesVar = 'pageFilesEager';
        }
    }
    else {
        (0, utils_js_1.assert)(false);
    }
    const varNameSuffix = (fileType === '.page' && 'Isomorph') ||
        (fileType === '.page.client' && 'Client') ||
        (fileType === '.page.server' && 'Server') ||
        (fileType === '.page.route' && 'Route');
    (0, utils_js_1.assert)(varNameSuffix);
    const varName = `${pageFilesVar}${varNameSuffix}`;
    const varNameLocals = [];
    return [
        ...globRoots.map((globRoot, i) => {
            const varNameLocal = `${varName}${i + 1}`;
            varNameLocals.push(varNameLocal);
            const globPath = `'${getGlobPath(globRoot, fileType)}'`;
            const globOptions = JSON.stringify({ eager: isEager, as: query });
            (0, utils_js_1.assert)(globOptions.startsWith('{"eager":true') || globOptions.startsWith('{"eager":false'));
            const globLine = `const ${varNameLocal} = import.meta.glob(${globPath}, ${globOptions});`;
            return globLine;
        }),
        `const ${varName} = {${varNameLocals.map((varNameLocal) => `...${varNameLocal}`).join(',')}};`,
        `${pageFilesVar}['${fileType}'] = ${varName};`,
        ''
    ].join('\n');
}
function getGlobRoots(config, configVps) {
    const globRoots = ['/'];
    configVps.extensions
        .map(({ pageConfigsSrcDir }) => pageConfigsSrcDir)
        .filter(utils_js_1.isNotNullish)
        .forEach((pageConfigsSrcDir) => {
        const globRoot = path_1.default.posix.relative(config.root, pageConfigsSrcDir);
        globRoots.push(globRoot);
    });
    return globRoots;
}
function getGlobPath(globRoot, fileType) {
    (0, utils_js_1.assertPosixPath)(globRoot);
    let globPath = [...globRoot.split('/'), '**', `*${fileType}.${utils_js_1.scriptFileExtensions}`].filter(Boolean).join('/');
    if (!globPath.startsWith('/')) {
        globPath = '/' + globPath;
    }
    return globPath;
}
