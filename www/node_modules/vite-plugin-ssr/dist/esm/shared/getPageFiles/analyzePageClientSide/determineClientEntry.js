export { determineClientEntry };
export { getVPSClientEntry };
function determineClientEntry({ pageFilesClientSide, pageFilesServerSide, isHtmlOnly, isClientRouting }) {
    let clientEntries = [];
    const pageFilesServerSideOnly = pageFilesServerSide.filter((p) => !pageFilesClientSide.includes(p));
    const clientDependencies = [];
    clientDependencies.push(...pageFilesClientSide.map((p) => ({ id: p.filePath, onlyAssets: false, eagerlyImported: false })));
    // CSS & assets
    clientDependencies.push(...pageFilesServerSideOnly.map((p) => ({ id: p.filePath, onlyAssets: true, eagerlyImported: false })));
    // Handle SPA & SSR pages.
    if (isHtmlOnly) {
        clientEntries = pageFilesClientSide.map((p) => p.filePath);
    }
    else {
        // Add the vps client entry
        const clientEntry = getVPSClientEntry(isClientRouting);
        clientDependencies.push({ id: clientEntry, onlyAssets: false, eagerlyImported: false });
        clientEntries = [clientEntry];
    }
    // console.log(pageFilesClientSide, pageFilesServerSide, clientDependencies, clientEntry)
    return { clientEntries, clientDependencies };
}
function getVPSClientEntry(isClientRouting) {
    return isClientRouting
        ? '@@vite-plugin-ssr/dist/esm/client/client-routing-runtime/entry.js'
        : '@@vite-plugin-ssr/dist/esm/client/server-routing-runtime/entry.js';
}
