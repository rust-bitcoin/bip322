export { retrieveAssetsProd };
import type { ViteManifest } from '../../../shared/ViteManifest.js';
import type { ClientDependency } from '../../../../shared/getPageFiles/analyzePageClientSide/ClientDependency.js';
declare function retrieveAssetsProd(clientDependencies: ClientDependency[], clientManifest: ViteManifest, includeAssetsImportedByServer: boolean, manifestKeyMap: Record<string, string>): string[];
