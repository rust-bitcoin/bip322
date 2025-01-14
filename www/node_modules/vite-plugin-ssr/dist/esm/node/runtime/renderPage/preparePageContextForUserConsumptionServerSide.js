export { preparePageContextForUserConsumptionServerSide };
import { assert, isPlainObject, isObject } from '../utils.js';
import { sortPageContext } from '../../../shared/sortPageContext.js';
import { assertPageContextUrlComputedProps } from '../../../shared/addUrlComputedProps.js';
import { addIs404ToPageProps } from '../../../shared/addIs404ToPageProps.js';
function preparePageContextForUserConsumptionServerSide(pageContext) {
    assertPageContextUrlComputedProps(pageContext);
    assert(isPlainObject(pageContext.routeParams));
    assert('Page' in pageContext);
    assert(isObject(pageContext.pageExports));
    assert(isObject(pageContext.exports));
    assert(isObject(pageContext.exportsAll));
    assert(typeof pageContext.isClientSideNavigation === 'boolean');
    sortPageContext(pageContext);
    addIs404ToPageProps(pageContext);
}
