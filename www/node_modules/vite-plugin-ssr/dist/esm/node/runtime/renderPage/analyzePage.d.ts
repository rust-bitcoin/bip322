export { analyzePage };
import type { PageFile } from '../../../shared/getPageFiles/getPageFileObject.js';
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
import { type AnalysisResult } from '../../../shared/getPageFiles/analyzePageClientSide.js';
declare function analyzePage(pageFilesAll: PageFile[], pageConfig: null | PageConfig, pageId: string): AnalysisResult;
