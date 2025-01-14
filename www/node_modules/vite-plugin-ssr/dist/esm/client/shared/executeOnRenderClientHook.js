export { executeOnRenderClientHook };
import { assert, assertUsage, executeHook } from '../server-routing-runtime/utils.js';
import { getHook } from '../../shared/hooks/getHook.js';
import { preparePageContextForUserConsumptionClientSide } from './preparePageContextForUserConsumptionClientSide.js';
async function executeOnRenderClientHook(pageContext, isClientRouting) {
    const pageContextForUserConsumption = preparePageContextForUserConsumptionClientSide(pageContext, isClientRouting);
    let hook = null;
    let hookName;
    {
        const renderHook = getHook(pageContext, 'render');
        hook = renderHook;
        hookName = 'render';
    }
    {
        const renderHook = getHook(pageContext, 'onRenderClient');
        if (renderHook) {
            hook = renderHook;
            hookName = 'onRenderClient';
        }
    }
    if (!hook) {
        const urlLogical = getUrlLogical(pageContext);
        if (pageContext._pageConfigs.length > 0) {
            // V1 design
            assertUsage(false, `No onRenderClient() hook defined for URL '${urlLogical}', but it's needed, see https://vite-plugin-ssr.com/onRenderClient`);
        }
        else {
            // TODO/v1-release: remove
            // V0.4 design
            const pageClientsFilesLoaded = pageContext._pageFilesLoaded.filter((p) => p.fileType === '.page.client');
            let errMsg;
            if (pageClientsFilesLoaded.length === 0) {
                errMsg = 'No file `*.page.client.*` found for URL ' + urlLogical;
            }
            else {
                errMsg =
                    'One of the following files should export a `render()` hook: ' +
                        pageClientsFilesLoaded.map((p) => p.filePath).join(' ');
            }
            assertUsage(false, errMsg);
        }
    }
    assert(hook);
    const renderHook = hook.hookFn;
    assert(hookName);
    // We don't use a try-catch wrapper because rendering errors are usually handled by the UI framework. (E.g. React's Error Boundaries.)
    const hookResult = await executeHook(() => renderHook(pageContextForUserConsumption), hookName, hook.hookFilePath);
    assertUsage(hookResult === undefined, `The ${hookName}() hook defined by ${hook.hookFilePath} isn't allowed to return a value`);
}
function getUrlLogical(pageContext) {
    let url;
    // try/catch to avoid passToClient assertUsage() (although: this may not be needed anymore, since we're now accessing pageContext and not pageContextForUserConsumption)
    try {
        url =
            // Client Routing
            pageContext.urlPathname ??
                // Server Routing
                pageContext.urlOriginal;
    }
    catch { }
    url = url ?? window.location.href;
    return url;
}
