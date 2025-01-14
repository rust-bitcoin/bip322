export { executeOnBeforeRenderHooks };
import { type PageContextExports } from '../../../shared/getPageFiles.js';
import { type PageContextForUserConsumptionServerSide } from './preparePageContextForUserConsumptionServerSide.js';
declare function executeOnBeforeRenderHooks(pageContext: {
    _pageId: string;
    _pageContextAlreadyProvidedByOnPrerenderHook?: true;
} & PageContextExports & PageContextForUserConsumptionServerSide): Promise<void>;
