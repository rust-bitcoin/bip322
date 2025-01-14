export { handleErrorWithoutErrorPage };
import type { PageContextAfterRender } from './renderPageAlreadyRouted.js';
import type { PageConfig } from '../../../shared/page-configs/PageConfig.js';
declare function handleErrorWithoutErrorPage<PageContext extends {
    isClientSideNavigation: boolean;
    errorWhileRendering: null | Error;
    is404: null | boolean;
    _pageId: null;
    _pageConfigs: PageConfig[];
    urlOriginal: string;
}>(pageContext: PageContext): Promise<PageContext & PageContextAfterRender>;
