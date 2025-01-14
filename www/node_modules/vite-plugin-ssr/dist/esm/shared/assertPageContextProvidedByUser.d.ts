export { assertPageContextProvidedByUser };
declare function assertPageContextProvidedByUser(pageContextProvidedByUser: unknown, { hookName, hookFilePath }: {
    hookFilePath: string;
    hookName: 'onBeforeRender' | 'onRenderHtml' | 'render' | 'onBeforeRoute';
}): asserts pageContextProvidedByUser is Record<string, unknown>;
