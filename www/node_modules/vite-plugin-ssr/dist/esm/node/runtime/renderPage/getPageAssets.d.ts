export { getPageAssets };
export type { PageAsset };
export type { GetPageAssets };
export type { PageContextGetPageAssets };
import { type MediaType } from './inferMediaType.js';
import type { ClientDependency } from '../../../shared/getPageFiles/analyzePageClientSide/ClientDependency.js';
type PageAsset = {
    src: string;
    assetType: null | NonNullable<MediaType>['assetType'];
    mediaType: null | NonNullable<MediaType>['mediaType'];
    isEntry: boolean;
};
type GetPageAssets = () => Promise<PageAsset[]>;
type PageContextGetPageAssets = {
    _baseServer: string;
    _baseAssets: string | null;
    _includeAssetsImportedByServer: boolean;
};
declare function getPageAssets(pageContext: PageContextGetPageAssets, clientDependencies: ClientDependency[], clientEntries: string[]): Promise<PageAsset[]>;
