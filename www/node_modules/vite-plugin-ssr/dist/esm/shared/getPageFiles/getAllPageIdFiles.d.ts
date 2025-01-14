export { getPageFilesClientSide };
export { getPageFilesServerSide };
import type { PageFile } from './getPageFileObject.js';
declare function getPageFilesClientSide(pageFilesAll: PageFile[], pageId: string): PageFile[];
declare function getPageFilesServerSide(pageFilesAll: PageFile[], pageId: string): PageFile[];
