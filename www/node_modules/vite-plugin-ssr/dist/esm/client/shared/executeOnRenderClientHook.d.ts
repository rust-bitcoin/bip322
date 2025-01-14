export { executeOnRenderClientHook };
import type { PageFile, PageContextExports } from '../../shared/getPageFiles.js';
import { type PageContextForUserConsumptionClientSide } from './preparePageContextForUserConsumptionClientSide.js';
import type { PageConfig } from '../../shared/page-configs/PageConfig.js';
declare function executeOnRenderClientHook<PC extends {
    _pageFilesLoaded: PageFile[];
    urlOriginal?: string;
    urlPathname?: string;
    _pageId: string;
    _pageConfigs: PageConfig[];
} & PageContextExports & PageContextForUserConsumptionClientSide>(pageContext: PC, isClientRouting: boolean): Promise<void>;
