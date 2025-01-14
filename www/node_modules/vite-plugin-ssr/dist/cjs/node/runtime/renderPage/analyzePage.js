"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePage = void 0;
const determineClientEntry_js_1 = require("../../../shared/getPageFiles/analyzePageClientSide/determineClientEntry.js");
const analyzePageClientSide_js_1 = require("../../../shared/getPageFiles/analyzePageClientSide.js");
const virtualFilePageConfigValuesAll_js_1 = require("../../shared/virtual-files/virtualFilePageConfigValuesAll.js");
const analyzeClientSide_js_1 = require("../../../shared/getPageFiles/analyzeClientSide.js");
const globalContext_js_1 = require("../globalContext.js");
const getClientEntryFilePath_js_1 = require("../../shared/getClientEntryFilePath.js");
function analyzePage(pageFilesAll, pageConfig, pageId) {
    if (pageConfig) {
        const { isClientSideRenderable, isClientRouting } = (0, analyzeClientSide_js_1.analyzeClientSide)(pageConfig, pageFilesAll, pageId);
        const clientFilePath = (0, getClientEntryFilePath_js_1.getClientEntryFilePath)(pageConfig);
        const clientEntry = !isClientSideRenderable ? clientFilePath : (0, determineClientEntry_js_1.getVPSClientEntry)(isClientRouting);
        const clientDependencies = [];
        clientDependencies.push({
            id: (0, virtualFilePageConfigValuesAll_js_1.getVirtualFileIdPageConfigValuesAll)(pageConfig.pageId, true),
            onlyAssets: false,
            eagerlyImported: false
        });
        // In production we inject the import of the server virtual module with ?extractAssets inside the client virtual module
        if (!(0, globalContext_js_1.getGlobalContext)().isProduction) {
            clientDependencies.push({
                id: (0, virtualFilePageConfigValuesAll_js_1.getVirtualFileIdPageConfigValuesAll)(pageConfig.pageId, false),
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
        return (0, analyzePageClientSide_js_1.analyzePageClientSide)(pageFilesAll, pageId);
    }
}
exports.analyzePage = analyzePage;
