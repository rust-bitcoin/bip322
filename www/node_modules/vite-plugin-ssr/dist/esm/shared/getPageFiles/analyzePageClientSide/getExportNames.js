export { getExportNames };
import { assert } from '../../utils.js';
function getExportNames(p) {
    if (p.fileType === '.css') {
        return [];
    }
    if (p.exportNames) {
        return p.exportNames;
    }
    assert(p.fileExports, p.filePath);
    const exportNames = Object.keys(p.fileExports);
    return exportNames;
}
