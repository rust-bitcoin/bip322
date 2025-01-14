export { getErrorPageId };
export { isErrorPageId };
export { isErrorPage };
import type { PageConfig } from './page-configs/PageConfig.js';
import type { PageFile } from './getPageFiles.js';
declare function getErrorPageId(pageFilesAll: PageFile[], pageConfigs: PageConfig[]): string | null;
declare function isErrorPageId(pageId: string, _isV1Design: false): boolean;
declare function isErrorPage(pageId: string, pageConfigs: PageConfig[]): boolean;
