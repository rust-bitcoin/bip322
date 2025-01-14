export { determineClientEntry };
export { getVPSClientEntry };
import type { ClientDependency } from './ClientDependency.js';
import type { PageFile } from '../../../shared/getPageFiles.js';
declare function determineClientEntry({ pageFilesClientSide, pageFilesServerSide, isHtmlOnly, isClientRouting }: {
    pageFilesClientSide: PageFile[];
    pageFilesServerSide: PageFile[];
    isHtmlOnly: boolean;
    isClientRouting: boolean;
}): {
    clientEntries: string[];
    clientDependencies: ClientDependency[];
};
declare function getVPSClientEntry(isClientRouting: boolean): "@@vite-plugin-ssr/dist/esm/client/client-routing-runtime/entry.js" | "@@vite-plugin-ssr/dist/esm/client/server-routing-runtime/entry.js";
