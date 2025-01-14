export { analyzePageServerSide };
import { assert } from '../utils.js';
import { getPageFilesServerSide } from './getAllPageIdFiles.js';
async function analyzePageServerSide(pageFilesAll, pageId) {
    const pageFilesServerSide = getPageFilesServerSide(pageFilesAll, pageId);
    const pageFilesServerSideOnly = pageFilesServerSide.filter((p) => p.fileType === '.page.server');
    await Promise.all(pageFilesServerSideOnly.map(async (p) => {
        // In production, `exportNames` are preload
        if (p.exportNames) {
            return;
        }
        assert(p.loadExportNames, pageId);
        await p.loadExportNames();
    }));
    const hasOnBeforeRenderServerSideOnlyHook = pageFilesServerSideOnly.some(({ exportNames }) => {
        assert(exportNames);
        return exportNames.includes('onBeforeRender');
    });
    return { hasOnBeforeRenderServerSideOnlyHook };
}
