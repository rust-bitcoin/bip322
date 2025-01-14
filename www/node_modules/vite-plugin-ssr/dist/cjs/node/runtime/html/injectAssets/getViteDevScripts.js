"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getViteDevScripts = void 0;
const globalContext_js_1 = require("../../globalContext.js");
const utils_js_1 = require("../../utils.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
async function getViteDevScripts() {
    const globalContext = (0, globalContext_js_1.getGlobalContext)();
    if (globalContext.isProduction) {
        return '';
    }
    const { viteDevServer } = globalContext;
    const fakeHtmlBegin = '<html> <head>'; // White space to test whether user is using a minifier
    const fakeHtmlEnd = '</head><body></body></html>';
    let fakeHtml = fakeHtmlBegin + fakeHtmlEnd;
    fakeHtml = await viteDevServer.transformIndexHtml('/', fakeHtml);
    (0, utils_js_1.assertUsage)(!fakeHtml.includes('vite-plugin-pwa'), `The HTML transformer of ${picocolors_1.default.cyan('vite-plugin-pwa')} cannot be applied, see workaround at https://github.com/brillout/vite-plugin-ssr/issues/388#issuecomment-1199280084`);
    (0, utils_js_1.assertUsage)(!fakeHtml.startsWith(fakeHtmlBegin.replace(' ', '')), 'Vite plugins that minify the HTML are not supported by vite-plugin-ssr, see https://github.com/brillout/vite-plugin-ssr/issues/224');
    (0, utils_js_1.assertUsage)(fakeHtml.startsWith(fakeHtmlBegin) && fakeHtml.endsWith(fakeHtmlEnd), 'You are using a Vite Plugin that transforms the HTML in a way that conflicts with vite-plugin-ssr. Create a new GitHub ticket to discuss a solution.');
    const viteInjection = fakeHtml.slice(fakeHtmlBegin.length, -1 * fakeHtmlEnd.length);
    (0, utils_js_1.assert)(viteInjection.includes('script'), { viteInjection });
    const scriptTags = viteInjection;
    return scriptTags;
}
exports.getViteDevScripts = getViteDevScripts;
