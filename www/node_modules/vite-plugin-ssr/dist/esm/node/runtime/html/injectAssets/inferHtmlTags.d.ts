export { inferAssetTag };
export { inferPreloadTag };
export { inferEarlyHintLink };
import type { PageAsset } from '../../renderPage/getPageAssets.js';
declare function inferPreloadTag(pageAsset: PageAsset): string;
declare function inferAssetTag(pageAsset: PageAsset): string;
declare function inferEarlyHintLink(pageAsset: PageAsset): string;
