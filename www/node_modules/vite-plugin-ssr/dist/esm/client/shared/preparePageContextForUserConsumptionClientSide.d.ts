export { preparePageContextForUserConsumptionClientSide };
export type { PageContextForUserConsumptionClientSide };
import type { PageContextExports } from '../../shared/getPageFiles.js';
import type { PageConfig } from '../../shared/page-configs/PageConfig.js';
import { PageContextForPassToClientWarning } from './getPageContextProxyForUser.js';
type PageContextForUserConsumptionClientSide = PageContextExports & PageContextForPassToClientWarning & {
    _pageId: string;
    _pageConfigs: PageConfig[];
};
declare function preparePageContextForUserConsumptionClientSide<T extends PageContextForUserConsumptionClientSide>(pageContext: T, isClientRouting: boolean): T & {
    Page: unknown;
};
