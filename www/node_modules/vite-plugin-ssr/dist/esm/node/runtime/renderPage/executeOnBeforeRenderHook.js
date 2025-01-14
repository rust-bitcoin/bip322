export { executeOnBeforeRenderHooks };
import { getHook } from '../../../shared/hooks/getHook.js';
import { preparePageContextForUserConsumptionServerSide } from './preparePageContextForUserConsumptionServerSide.js';
import { executeHook } from '../utils.js';
import { assertOnBeforeRenderHookReturn } from '../../../shared/assertOnBeforeRenderHookReturn.js';
async function executeOnBeforeRenderHooks(pageContext) {
    if (pageContext._pageContextAlreadyProvidedByOnPrerenderHook) {
        return;
    }
    const hook = getHook(pageContext, 'onBeforeRender');
    if (!hook) {
        return;
    }
    const onBeforeRender = hook.hookFn;
    preparePageContextForUserConsumptionServerSide(pageContext);
    const hookResult = await executeHook(() => onBeforeRender(pageContext), 'onBeforeRender', hook.hookFilePath);
    assertOnBeforeRenderHookReturn(hookResult, hook.hookFilePath);
    const pageContextFromHook = hookResult?.pageContext;
    Object.assign(pageContext, pageContextFromHook);
}
