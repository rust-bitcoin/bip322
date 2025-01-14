export { isErrorDebug };
import { isDebugEnabled } from '../utils.js';
function isErrorDebug() {
    return isDebugEnabled('vps:error');
}
