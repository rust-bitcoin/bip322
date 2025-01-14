// TODO/v1-release: remove
export { getPageFileObject };
import { determinePageIdOld } from '../determinePageIdOld.js';
import { assertPageFilePath } from '../assertPageFilePath.js';
import { isErrorPageId } from '../error-page.js';
import { assert, slice } from '../utils.js';
import { determineFileType } from './fileTypes.js';
function getPageFileObject(filePath) {
    const isRelevant = (pageId) => pageFile.pageId === pageId ||
        (pageFile.isDefaultPageFile &&
            (isRendererFilePath(pageFile.filePath) || isAncestorDefaultPage(pageId, pageFile.filePath)));
    const fileType = determineFileType(filePath);
    const isEnv = (env) => {
        assert(fileType !== '.page.route'); // We can't determine `.page.route.js`
        if (env === 'CLIENT_ONLY') {
            return fileType === '.page.client' || fileType === '.css';
        }
        if (env === 'SERVER_ONLY') {
            return fileType === '.page.server';
        }
        if (env === 'CLIENT_AND_SERVER') {
            return fileType === '.page';
        }
        assert(false);
    };
    const pageFile = {
        filePath,
        fileType,
        isEnv,
        isRelevant,
        isDefaultPageFile: isDefaultFilePath(filePath),
        isRendererPageFile: fileType !== '.css' && isDefaultFilePath(filePath) && isRendererFilePath(filePath),
        isErrorPageFile: isErrorPageId(filePath, false),
        pageId: determinePageIdOld(filePath)
    };
    return pageFile;
}
function isDefaultFilePath(filePath) {
    assertPageFilePath(filePath);
    if (isErrorPageId(filePath, false)) {
        return false;
    }
    return filePath.includes('/_default');
}
function isRendererFilePath(filePath) {
    assertPageFilePath(filePath);
    return filePath.includes('/renderer/');
}
function isAncestorDefaultPage(pageId, defaultPageFilePath) {
    assertPageFilePath(pageId);
    assertPageFilePath(defaultPageFilePath);
    assert(!pageId.endsWith('/'));
    assert(!defaultPageFilePath.endsWith('/'));
    assert(isDefaultFilePath(defaultPageFilePath));
    const defaultPageDir = slice(defaultPageFilePath.split('/'), 0, -1)
        .filter((filePathSegment) => filePathSegment !== '_default')
        .join('/');
    return pageId.startsWith(defaultPageDir);
}
