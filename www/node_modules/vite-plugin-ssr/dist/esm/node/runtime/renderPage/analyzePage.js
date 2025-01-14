export { analyzePage };
import { getVPSClientEntry } from '../../../shared/getPageFiles/analyzePageClientSide/determineClientEntry.js';
import { analyzePageClientSide } from '../../../shared/getPageFiles/analyzePageClientSide.js';
import { getVirtualFileIdPageConfigValuesAll } from '../../shared/virtual-files/virtualFilePageConfigValuesAll.js';
import { analyzeClientSide } from '../../../shared/getPageFiles/analyzeClientSide.js';
import { getGlobalContext } from '../globalContext.js';
import { getClientEntryFilePath } from '../../shared/getClientEntryFilePath.js';
function analyzePage(pageFilesAll, pageConfig, pageId) {
    if (pageConfig) {
        const { isClientSideRenderable, isClientRouting } = analyzeClientSide(pageConfig, pageFilesAll, pageId);
        const clientFilePath = getClientEntryFilePath(pageConfig);
        const clientEntry = !isClientSideRenderable ? clientFilePath : getVPSClientEntry(isClientRouting);
        const clientDependencies = [];
        clientDependencies.push({
            id: getVirtualFileIdPageConfigValuesAll(pageConfig.pageId, true),
            onlyAssets: false,
            eagerlyImported: false
        });
        // In production we inject the import of the server virtual module with ?extractAssets inside the client virtual module
        if (!getGlobalContext().isProduction) {
            clientDependencies.push({
                id: getVirtualFileIdPageConfigValuesAll(pageConfig.pageId, false),
                onlyAssets: true,
                eagerlyImported: false
            });
        }
        /* Remove?
        Object.values(pageConfig.configElements).forEach((configElement) => {
          if (configElement.importFilePath) {
            const { env } = configElement
            assert(env)
            const onlyAssets = env === 'server-only'
            const eagerlyImported = env === '_routing-eager'
            if (onlyAssets || eagerlyImported) {
              clientDependencies.push({
                id: configElement.importFilePath,
                onlyAssets,
                eagerlyImported
              })
            }
          }
        })
        */
        const clientEntries = [];
        if (clientEntry) {
            clientDependencies.push({
                id: clientEntry,
                onlyAssets: false,
                eagerlyImported: false
            });
            clientEntries.push(clientEntry);
        }
        return {
            isHtmlOnly: !isClientSideRenderable,
            isClientRouting,
            clientEntries,
            clientDependencies,
            // pageFilesClientSide and pageFilesServerSide are only used for debugging
            pageFilesClientSide: [],
            pageFilesServerSide: []
        };
    }
    else {
        return analyzePageClientSide(pageFilesAll, pageId);
    }
}
