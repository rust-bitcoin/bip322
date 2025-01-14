"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configDefinitionsBuiltInGlobal = exports.configDefinitionsBuiltIn = void 0;
const helpers_js_1 = require("../helpers.js");
const configDefinitionsBuiltIn = {
    onRenderHtml: {
        env: 'server-only'
    },
    onRenderClient: {
        env: 'client-only'
    },
    onHydrationEnd: {
        env: 'client-only'
    },
    onPageTransitionStart: {
        env: 'client-only'
    },
    onPageTransitionEnd: {
        env: 'client-only'
    },
    onBeforeRender: {
        env: 'server-only'
    },
    onBeforePrerenderStart: {
        env: 'server-only'
    },
    Page: {
        env: 'server-and-client'
    },
    passToClient: {
        env: 'server-only',
        cumulative: true
    },
    route: {
        env: '_routing-eager'
    },
    guard: {
        env: '_routing-lazy'
    },
    iKnowThePerformanceRisksOfAsyncRouteFunctions: {
        env: '_routing-eager'
    },
    filesystemRoutingRoot: {
        env: 'config-only'
    },
    client: {
        // The value of the client config is merely the file path to the client entry file, which is only needed on the sever-side
        env: 'server-only',
        _valueIsFilePath: true
    },
    clientRouting: {
        env: 'server-and-client' // TODO: config-only instead?
    },
    prerender: {
        env: 'server-only'
    },
    hydrationCanBeAborted: {
        env: 'client-only' // TODO: config-only instead?
    },
    prefetchStaticAssets: {
        env: 'client-only' // TODO: config-only instead?
    },
    extends: {
        env: 'config-only'
    },
    meta: {
        env: 'config-only'
    },
    isClientSideRenderable: {
        env: 'server-and-client',
        _computed: (pageConfig) => (0, helpers_js_1.isConfigSet)(pageConfig, 'onRenderClient') &&
            (0, helpers_js_1.isConfigSet)(pageConfig, 'Page') &&
            (0, helpers_js_1.getConfigEnv)(pageConfig, 'Page') !== 'server-only'
    },
    onBeforeRenderEnv: {
        env: 'client-only',
        _computed: (pageConfig) => !(0, helpers_js_1.isConfigSet)(pageConfig, 'onBeforeRender') ? null : (0, helpers_js_1.getConfigEnv)(pageConfig, 'onBeforeRender')
    }
};
exports.configDefinitionsBuiltIn = configDefinitionsBuiltIn;
const configDefinitionsBuiltInGlobal = {
    onPrerenderStart: {
        env: 'server-only'
    },
    onBeforeRoute: {
        env: '_routing-eager'
    },
    prerender: {
        env: 'config-only'
    },
    extensions: { env: 'config-only' },
    disableAutoFullBuild: { env: 'config-only' },
    includeAssetsImportedByServer: { env: 'config-only' },
    baseAssets: { env: 'config-only' },
    baseServer: { env: 'config-only' },
    redirects: { env: 'server-only' },
    trailingSlash: { env: 'server-only' },
    disableUrlNormalization: { env: 'server-only' }
};
exports.configDefinitionsBuiltInGlobal = configDefinitionsBuiltInGlobal;
