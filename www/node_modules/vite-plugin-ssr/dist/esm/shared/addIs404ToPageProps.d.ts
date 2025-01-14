export { addIs404ToPageProps };
import type { PageConfig } from './page-configs/PageConfig.js';
declare function addIs404ToPageProps(pageContext: Record<string, unknown> & PageContextAssertIs404): void;
type PageContextAssertIs404 = {
    _pageId: string;
    _pageConfigs: PageConfig[];
};
