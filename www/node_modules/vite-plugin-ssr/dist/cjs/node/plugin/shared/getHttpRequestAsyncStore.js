"use strict";
// Purpose of this file:
//  - Swallow redundant error messages (Vite is buggy and emits the same error multiple times)
//  - Prepend "[request(n)]" tag to Vite logs
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installHttpRequestAsyncStore = exports.getHttpRequestAsyncStore = void 0;
const renderPage_js_1 = require("../../runtime/renderPage.js");
const utils_js_1 = require("../utils.js");
const transpileAndExecuteFile_js_1 = require("../plugins/importUserCode/v1-design/transpileAndExecuteFile.js");
const loggerNotProd_js_1 = require("./loggerNotProd.js");
const errorWithCodeSnippet_js_1 = require("./loggerNotProd/errorWithCodeSnippet.js");
(0, utils_js_1.assertIsNotProductionRuntime)();
let asyncLocalStorage = null;
async function installHttpRequestAsyncStore() {
    let mod;
    try {
        mod = await Promise.resolve().then(() => __importStar(require('node:async_hooks')));
    }
    catch {
        return;
    }
    asyncLocalStorage = new mod.AsyncLocalStorage();
    (0, renderPage_js_1.renderPage_addWrapper)(async (httpRequestId, renderPage) => {
        (0, utils_js_1.assert)(asyncLocalStorage);
        const loggedErrors = new Set();
        const markErrorAsLogged = (err) => {
            loggedErrors.add(err);
        };
        const shouldErrorBeSwallowed = (err) => {
            if (loggedErrors.has(err) ||
                Array.from(loggedErrors).some((errAlreadyLogged) => isEquivalent(err, errAlreadyLogged))) {
                // In principle, some random message can be shown between the non-swallowed error and this logErrorDebugNote() call.
                // We take a leap of faith that it happens only seldomly and that it's worth the risk.
                (0, loggerNotProd_js_1.logErrorDebugNote)();
                return true;
            }
            else {
                return false;
            }
        };
        // Remove once https://github.com/vitejs/vite/pull/13495 is released
        const swallowedErrorMessages = new Set();
        const markErrorMessageAsLogged = (errMsg) => {
            swallowedErrorMessages.add(errMsg);
        };
        const onRequestDone = () => {
            swallowedErrorMessages.forEach((errMsg) => {
                if (!Array.from(loggedErrors).some((err) => String(err).includes(errMsg))) {
                    console.error('loggedErrors', loggedErrors);
                    console.error('swallowedErrorMessages', swallowedErrorMessages);
                    (0, utils_js_1.assert)(false);
                }
            });
        };
        const store = {
            httpRequestId,
            markErrorAsLogged,
            markErrorMessageAsLogged,
            shouldErrorBeSwallowed,
            errorDebugNoteAlreadyShown: false
        };
        const pageContextReturn = await asyncLocalStorage.run(store, renderPage);
        return { pageContextReturn, onRequestDone };
    });
    return;
}
exports.installHttpRequestAsyncStore = installHttpRequestAsyncStore;
function getHttpRequestAsyncStore() {
    if (asyncLocalStorage === null)
        return null;
    const store = asyncLocalStorage.getStore();
    (0, utils_js_1.assert)(store === undefined || (0, utils_js_1.isObject)(store));
    return store;
}
exports.getHttpRequestAsyncStore = getHttpRequestAsyncStore;
function isEquivalent(err1, err2) {
    if (err1 === err2)
        return true;
    if (!(0, utils_js_1.isObject)(err1) || !(0, utils_js_1.isObject)(err2))
        return false;
    {
        const errMsgFormatted1 = (0, transpileAndExecuteFile_js_1.getConfigBuildErrorFormatted)(err1);
        const errMsgFormatted2 = (0, transpileAndExecuteFile_js_1.getConfigBuildErrorFormatted)(err2);
        if (errMsgFormatted1 && errMsgFormatted1 === errMsgFormatted2)
            return true;
    }
    if ((0, errorWithCodeSnippet_js_1.isEquivalentErrorWithCodeSnippet)(err1, err2))
        return true;
    if (err1.constructor === Error &&
        Object.keys(err1).length === 0 &&
        isDefinedAndSame(err1.message, err2.message) &&
        isDefinedAndSame(err1.stack, err2.stack)) {
        return true;
    }
    return false;
}
function isDefinedAndSame(val1, val2) {
    return val1 && val1 === val2;
}
