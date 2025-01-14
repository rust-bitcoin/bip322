export { renderPage } from './renderPage.js';
export { escapeInject, dangerouslySkipEscape } from './html/renderHtml.js';
export { pipeWebStream, pipeNodeStream, pipeStream, stampPipe } from './html/stream.js';
export { injectAssets__public as _injectAssets } from './html/injectAssets/injectAssets__public.js';
export { createPageRenderer } from '../createPageRenderer.js';
declare global {
    var _isVitePluginSsr: true;
    var _isVike: true;
}
import './page-files/setup.js';
