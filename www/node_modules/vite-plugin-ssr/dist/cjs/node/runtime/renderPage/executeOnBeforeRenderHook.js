"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeOnBeforeRenderHooks = void 0;
const getHook_js_1 = require("../../../shared/hooks/getHook.js");
const preparePageContextForUserConsumptionServerSide_js_1 = require("./preparePageContextForUserConsumptionServerSide.js");
const utils_js_1 = require("../utils.js");
const assertOnBeforeRenderHookReturn_js_1 = require("../../../shared/assertOnBeforeRenderHookReturn.js");
async function executeOnBeforeRenderHooks(pageContext) {
    if (pageContext._pageContextAlreadyProvidedByOnPrerenderHook) {
        return;
    }
    const hook = (0, getHook_js_1.getHook)(pageContext, 'onBeforeRender');
    if (!hook) {
        return;
    }
    const onBeforeRender = hook.hookFn;
    (0, preparePageContextForUserConsumptionServerSide_js_1.preparePageContextForUserConsumptionServerSide)(pageContext);
    const hookResult = await (0, utils_js_1.executeHook)(() => onBeforeRender(pageContext), 'onBeforeRender', hook.hookFilePath);
    (0, assertOnBeforeRenderHookReturn_js_1.assertOnBeforeRenderHookReturn)(hookResult, hook.hookFilePath);
    const pageContextFromHook = hookResult?.pageContext;
    Object.assign(pageContext, pageContextFromHook);
}
exports.executeOnBeforeRenderHooks = executeOnBeforeRenderHooks;
