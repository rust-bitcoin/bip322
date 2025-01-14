import { setPageFilesAsync } from '../../../shared/getPageFiles.js';
import { assert, debugGlob, isObject } from '../utils.js';
import { getViteDevServer } from '../globalContext.js';
import { virtualFileIdImportUserCodeServer } from '../../shared/virtual-files/virtualFileImportUserCode.js';
setPageFilesAsync(getPageFilesExports);
async function getPageFilesExports() {
    const viteDevServer = getViteDevServer();
    assert(viteDevServer);
    let moduleExports;
    try {
        moduleExports = await viteDevServer.ssrLoadModule(virtualFileIdImportUserCodeServer);
    }
    catch (err) {
        debugGlob(`Glob error: ${virtualFileIdImportUserCodeServer} transpile error: `, err);
        throw err;
    }
    moduleExports = moduleExports.default || moduleExports;
    debugGlob('Glob result: ', moduleExports);
    assert(isObject(moduleExports));
    return moduleExports;
}
