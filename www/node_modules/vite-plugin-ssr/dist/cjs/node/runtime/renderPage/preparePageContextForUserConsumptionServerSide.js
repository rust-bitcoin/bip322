"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preparePageContextForUserConsumptionServerSide = void 0;
const utils_js_1 = require("../utils.js");
const sortPageContext_js_1 = require("../../../shared/sortPageContext.js");
const addUrlComputedProps_js_1 = require("../../../shared/addUrlComputedProps.js");
const addIs404ToPageProps_js_1 = require("../../../shared/addIs404ToPageProps.js");
function preparePageContextForUserConsumptionServerSide(pageContext) {
    (0, addUrlComputedProps_js_1.assertPageContextUrlComputedProps)(pageContext);
    (0, utils_js_1.assert)((0, utils_js_1.isPlainObject)(pageContext.routeParams));
    (0, utils_js_1.assert)('Page' in pageContext);
    (0, utils_js_1.assert)((0, utils_js_1.isObject)(pageContext.pageExports));
    (0, utils_js_1.assert)((0, utils_js_1.isObject)(pageContext.exports));
    (0, utils_js_1.assert)((0, utils_js_1.isObject)(pageContext.exportsAll));
    (0, utils_js_1.assert)(typeof pageContext.isClientSideNavigation === 'boolean');
    (0, sortPageContext_js_1.sortPageContext)(pageContext);
    (0, addIs404ToPageProps_js_1.addIs404ToPageProps)(pageContext);
}
exports.preparePageContextForUserConsumptionServerSide = preparePageContextForUserConsumptionServerSide;
