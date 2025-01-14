"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installRequireShim_setUserRootDir = exports.installRequireShim = void 0;
const utils_cjs_1 = require("./utils.cjs");
const globalObject = (0, utils_cjs_1.getGlobalObject)('utils/require-shim.ts', {});
(0, utils_cjs_1.assertIsNotBrowser)();
// Add require() to ESM modules, in order to workaround https://github.com/brillout/vite-plugin-ssr/issues/701
//  - esbuild doesn't always transpile require() to import(), https://github.com/evanw/esbuild/issues/566#issuecomment-735551834
//  - Vite's esbuild workaround plugin doesn't transform require() into ESM import for Node.js, https://github.com/vitejs/vite/blob/a595b115efbd38ac31c2de62ce5dd0faca424d02/packages/vite/src/node/optimizer/esbuildDepPlugin.ts#L290
//  - Test: [/test/require-shim/](https://github.com/brillout/vite-plugin-ssr/tree/88a05ef4888d0df28a370d0ca0460bf8036aadf0/test/require-shim)
//  - Playground: https://github.com/brillout/require-shim/tree/playground
function installRequireShim() {
    if (globalObject.alreadyCalled)
        return;
    globalObject.alreadyCalled = true;
    let requireLocal;
    try {
        requireLocal = require;
    }
    catch (_a) { }
    // If node_modules/@brillout/require-shim/ is bundled into user code, then this file can be ESM. We have to abort because there doesn't seem to be a way to add the shim in a syncrhonous way. Adding it asynchronously leads to race conditions which is worse than not adding the shim at all.
    //   - There doesn't seem to be require() syncrhonous alternerative for ESM: https://stackoverflow.com/questions/51069002/convert-import-to-synchronous
    if (!requireLocal)
        return;
    let module;
    try {
        // Make dependency optional for Edge environments
        module = requireLocal('module');
    }
    catch (_b) {
        // Edge environments
        return;
    }
    // We cannot use `typeof require === 'undefined'` since it's always true as this file is CJS (it's node_modules/@brillout/require-shim/dist/index.cjs)
    if (globalThis.require === undefined) {
        install();
    }
    testShim();
    return;
    function install() {
        // In ESM modules, any `require()` occurence will fallback and use globalThis.require() (since require() isn't defined in ESM modules)
        Object.defineProperty(globalThis, 'require', {
            get() {
                // We cannot move this code block into its own function because of bundlers that inline functions. (Otherwise stack[number] can be shifted and can point to the wrong callsite.)
                let callsites;
                {
                    const prepareStackTraceOrg = Error.prepareStackTrace;
                    // https://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function/66842927#66842927
                    Error.prepareStackTrace = (_, stack) => stack;
                    const err = new Error();
                    callsites = err.stack;
                    Error.prepareStackTrace = prepareStackTraceOrg;
                }
                // If callerFile is null => upon require('./some/relative/path') the shim cannot work and the user's app will crash with certainty => ideally we should assert(false) this situation (we currenlty don't) and try to resolve the situation together with the user. We didn't implement the assert(false) catch because it would require wrapping requireUserLand which isn't trivial.
                const callerFile = getCallerFile(callsites);
                // callerFileFallback creates an erroneous requireUserLand but it'll work for non-relative require paths such as require('some-library')
                const callerFileFallback = __filename;
                const requireContextFile = callerFile || callerFileFallback;
                (0, utils_cjs_1.assert)(requireContextFile);
                const requireUserLand = module.createRequire(requireContextFile);
                // @ts-expect-error
                requireUserLand._is_brillout_require_shim = true;
                return requireUserLand;
            }
        });
    }
    function getCallerFile(callsites) {
        const caller = callsites[1];
        (0, utils_cjs_1.assert)(caller);
        // Bun 0.7.0 throws:
        //  ```
        //  TypeError: caller.getFileName is not a function. (In 'caller.getFileName()', 'caller.getFileName' is undefined)
        //  ```
        if (!caller.getFileName)
            return null;
        {
            const filePath = caller.getFileName();
            // caller.getFileName() can be undefined when Vite evaluates code (the code then doesn't belong to a file on the filesystem):
            //  - When the user tries to use require(): https//github.com/brillout/vite-plugin-ssr/issues/879
            //  - When using ssr.noExternal: https://github.com/brillout/vps-mui/tree/reprod-2 - see https://github.com/brillout/vite-plugin-ssr/discussions/901#discussioncomment-5975978
            (0, utils_cjs_1.assert)((typeof filePath === 'string' && filePath) || filePath === undefined);
            if (filePath)
                return filePath;
        }
        {
            const filePath = deriveFilePath(caller);
            if (filePath) {
                return filePath;
            }
        }
        return null;
    }
    function deriveFilePath(caller) {
        // caller.getEvalOrigin() value is set by `# sourceURL=...`, for example at https://github.com/vitejs/vite/blob/e3db7712657232fbb9ea2499a2c6f277d2bb96a3/packages/vite/src/node/ssr/ssrModuleLoader.ts#L225
        let filePath = caller.getEvalOrigin();
        if (!filePath)
            return null;
        if (doesPathExist(filePath)) {
            return filePath;
        }
        // /test/require-shim/ => sourceUrl is relative to the user's root dir. (It seems like older Vite versions set sourceUrl to the path relative to the user's root dir, while newer Vite versions set sourceURL to the absolute path?)
        const { userRootDir } = globalObject;
        if (!userRootDir)
            return null;
        let filePathAbsolute = (0, utils_cjs_1.toPosixPath)(filePath);
        (0, utils_cjs_1.assertPosixPath)(userRootDir);
        filePathAbsolute = (0, utils_cjs_1.pathJoin)(userRootDir, filePathAbsolute);
        if (doesPathExist(filePathAbsolute)) {
            return filePathAbsolute;
        }
        return null;
    }
    function doesPathExist(filePath) {
        (0, utils_cjs_1.assert)(requireLocal);
        try {
            requireLocal.resolve(filePath);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
}
exports.installRequireShim = installRequireShim;
// Ensure that our globalThis.require doesn't overwrite the native require() implementation
function testShim() {
    // Seems like Vitest does some unusual thing
    if ((0, utils_cjs_1.isVitest)())
        return;
    (0, utils_cjs_1.assert)(require !== globalThis.require);
    (0, utils_cjs_1.assert)(!('_is_brillout_require_shim' in require));
    import('./runtime-test.cjs');
}
function installRequireShim_setUserRootDir(userRootDir) {
    globalObject.userRootDir = userRootDir;
}
exports.installRequireShim_setUserRootDir = installRequireShim_setUserRootDir;
