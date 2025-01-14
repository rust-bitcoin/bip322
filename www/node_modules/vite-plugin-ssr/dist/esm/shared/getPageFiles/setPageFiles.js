export { setPageFiles };
export { setPageFilesAsync };
export { getPageFilesAll };
import { assert, unique } from '../utils.js';
import { parseGlobResults } from './parseGlobResults.js';
import { getGlobalObject } from '../../utils/getGlobalObject.js';
const globalObject = getGlobalObject('setPageFiles.ts', {});
// TODO:v1-design-release: rename setPageFiles() getPageFilesAll() parseGlobResult()
function setPageFiles(pageFilesExports) {
    const { pageFiles, pageConfigs, pageConfigGlobal } = parseGlobResults(pageFilesExports);
    globalObject.pageFilesAll = pageFiles;
    globalObject.pageConfigs = pageConfigs;
    globalObject.pageConfigGlobal = pageConfigGlobal;
}
function setPageFilesAsync(getPageFilesExports) {
    globalObject.pageFilesGetter = async () => {
        setPageFiles(await getPageFilesExports());
    };
}
async function getPageFilesAll(isClientSide, isProduction) {
    if (isClientSide) {
        assert(!globalObject.pageFilesGetter);
        assert(isProduction === undefined);
    }
    else {
        assert(globalObject.pageFilesGetter);
        assert(typeof isProduction === 'boolean');
        if (!globalObject.pageFilesAll ||
            // We reload all glob imports in dev to make auto-reload work
            !isProduction) {
            await globalObject.pageFilesGetter();
        }
    }
    const { pageFilesAll, pageConfigs, pageConfigGlobal } = globalObject;
    assert(pageFilesAll && pageConfigs && pageConfigGlobal);
    const allPageIds = getAllPageIds(pageFilesAll, pageConfigs);
    return { pageFilesAll, allPageIds, pageConfigs, pageConfigGlobal };
}
function getAllPageIds(allPageFiles, pageConfigs) {
    const fileIds = allPageFiles.filter(({ isDefaultPageFile }) => !isDefaultPageFile).map(({ pageId }) => pageId);
    const allPageIds = unique(fileIds);
    const allPageIds2 = pageConfigs.map((p) => p.pageId);
    return [...allPageIds, ...allPageIds2];
}
