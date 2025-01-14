export { getEarlyHints };
export type { EarlyHint };
import type { PageAsset } from './getPageAssets.js';
type EarlyHint = PageAsset & {
    earlyHintLink: string;
};
declare function getEarlyHints(assets: PageAsset[]): EarlyHint[];
