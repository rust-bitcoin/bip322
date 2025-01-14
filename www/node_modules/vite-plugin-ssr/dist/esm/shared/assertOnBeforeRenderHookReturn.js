export { assertOnBeforeRenderHookReturn };
import { assertUsage, isPlainObject } from './utils.js';
import { assertPageContextProvidedByUser } from './assertPageContextProvidedByUser.js';
import { assertHookReturnedObject } from './assertHookReturnedObject.js';
import pc from '@brillout/picocolors';
function assertOnBeforeRenderHookReturn(hookReturnValue, hookFilePath) {
    if (hookReturnValue === undefined || hookReturnValue === null) {
        return;
    }
    const errPrefix = `The onBeforeRender() hook defined by ${hookFilePath}`;
    assertUsage(isPlainObject(hookReturnValue), `${errPrefix} should return a plain JavaScript object, ${pc.cyan('undefined')}, or ${pc.cyan('null')}`);
    assertHookReturnedObject(hookReturnValue, ['pageContext'], errPrefix);
    if (hookReturnValue.pageContext) {
        assertPageContextProvidedByUser(hookReturnValue['pageContext'], { hookName: 'onBeforeRender', hookFilePath });
    }
}
