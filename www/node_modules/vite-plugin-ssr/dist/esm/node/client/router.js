export { navigate };
export { reload };
import { assertWarning } from '../../utils/assert.js';
// `never` to ensure package.json#exports["./client/router"].types points to type defined by the client-side code
const navigate = (() => warnNoEffect('navigate'));
const reload = (() => warnNoEffect('reload'));
function warnNoEffect(caller) {
    assertWarning(false, `Calling ${caller} on the server-side has no effect`, {
        showStackTrace: true,
        onlyOnce: false
    });
}
