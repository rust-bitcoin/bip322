export { retrieveAssetsDev };
import type { ViteDevServer } from 'vite';
import type { ClientDependency } from '../../../../shared/getPageFiles/analyzePageClientSide/ClientDependency.js';
declare function retrieveAssetsDev(clientDependencies: ClientDependency[], viteDevServer: ViteDevServer): Promise<string[]>;
