"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializePageContextAbort = exports.serializePageContextClientSide = void 0;
const stringify_1 = require("@brillout/json-serializer/stringify");
const utils_js_1 = require("../utils.js");
const error_page_js_1 = require("../../../shared/error-page.js");
const addIs404ToPageProps_js_1 = require("../../../shared/addIs404ToPageProps.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const notSerializable_js_1 = require("../../../shared/notSerializable.js");
const PASS_TO_CLIENT = [
    'abortReason',
    '_urlRewrite',
    '_urlRedirect',
    'abortStatusCode',
    '_abortCall',
    /* Not needed on the client-side
    '_abortCaller',
    */
    '_pageContextInitHasClientData',
    '_pageId'
];
const PASS_TO_CLIENT_ERROR_PAGE = ['pageProps', 'is404', '_isError'];
function serializePageContextClientSide(pageContext) {
    const passToClient = getPassToClient(pageContext);
    const pageContextClient = {};
    passToClient.forEach((prop) => {
        // We set non-existing props to `undefined`, in order to pass the list of passToClient values to the client-side
        pageContextClient[prop] = pageContext[prop];
    });
    if (Object.keys(pageContext._pageContextInit).some((p) => passToClient.includes(p))) {
        pageContextClient._pageContextInitHasClientData = true;
    }
    let pageContextSerialized;
    try {
        pageContextSerialized = serialize(pageContextClient);
    }
    catch (err) {
        const h = (s) => picocolors_1.default.cyan(s);
        let hasWarned = false;
        const propsNonSerializable = [];
        passToClient.forEach((prop) => {
            const propName = JSON.stringify(prop);
            const varName = h(`pageContext[${propName}]`);
            try {
                serialize(pageContext[prop], varName);
            }
            catch (err) {
                hasWarned = true;
                propsNonSerializable.push(prop);
                (0, utils_js_1.assert)((0, utils_js_1.hasProp)(err, 'messageCore', 'string'));
                (0, utils_js_1.assertWarning)(false, [
                    `${varName} cannot be serialized and, therefore, cannot be passed to the client.`,
                    `Make sure that ${varName} is serializable, or remove ${h(propName)} from ${h('passToClient')}.`,
                    `Serialization error: ${err.messageCore}.`
                ].join(' '), { onlyOnce: false });
            }
        });
        (0, utils_js_1.assert)(hasWarned);
        propsNonSerializable.forEach((prop) => {
            pageContextClient[prop] = notSerializable_js_1.notSerializable;
        });
        pageContextSerialized = serialize(pageContextClient);
    }
    return pageContextSerialized;
}
exports.serializePageContextClientSide = serializePageContextClientSide;
function serialize(value, varName) {
    return (0, stringify_1.stringify)(value, { forbidReactElements: true, valueName: varName });
}
function getPassToClient(pageContext) {
    let passToClient = [...pageContext._passToClient, ...PASS_TO_CLIENT];
    if ((0, error_page_js_1.isErrorPage)(pageContext._pageId, pageContext._pageConfigs)) {
        (0, utils_js_1.assert)((0, utils_js_1.hasProp)(pageContext, 'is404', 'boolean'));
        (0, addIs404ToPageProps_js_1.addIs404ToPageProps)(pageContext);
        passToClient.push(...PASS_TO_CLIENT_ERROR_PAGE);
    }
    passToClient = (0, utils_js_1.unique)(passToClient);
    return passToClient;
}
function serializePageContextAbort(pageContext) {
    (0, utils_js_1.assert)(pageContext._urlRedirect || pageContext._urlRewrite || pageContext.abortStatusCode);
    (0, utils_js_1.assert)(pageContext._abortCall);
    (0, utils_js_1.assert)(pageContext._abortCaller);
    // Not needed on the client-side
    delete pageContext._abortCaller;
    const unknownProps = Object.keys(pageContext).filter((prop) => ![
        // prettier-ignore
        '_abortCall',
        /* Not needed on the client-side
        '_abortCaller',
        */
        '_urlRedirect',
        '_urlRewrite',
        'abortStatusCode',
        'abortReason',
        'is404',
        'pageProps'
    ].includes(prop));
    if (!pageContext._isLegacyRenderErrorPage) {
        (0, utils_js_1.assert)(unknownProps.length === 0);
    }
    else {
        // TODO/v1-release: remove
        (0, utils_js_1.assertWarning)(unknownProps.length === 0, [
            "The following pageContext values won't be available on the client-side:",
            unknownProps.map((p) => `  pageContext[${JSON.stringify(p)}]`),
            'Use `throw render()` instead of `throw RenderErrorPage()`'
        ].join('\n'), {
            onlyOnce: false
        });
    }
    return serialize(pageContext);
}
exports.serializePageContextAbort = serializePageContextAbort;
